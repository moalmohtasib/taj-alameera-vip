#!/usr/bin/env node
/* ==========================================================================
   TAJ ALAMEERA — Salla Product-Import CSV Builder
   --------------------------------------------------------------------------
   Reads price-sync/seed-products.json, computes each product's LAUNCH price
   from the LIVE gram price (same formula as price-sync.js / create-products),
   and emits price-sync/salla-import.csv — a spreadsheet you upload via
   Salla dashboard: المنتجات → استيراد وتصدير → استيراد منتجات جديدة.

   NO API TOKEN. NO Salla Partner. NO approval. Just a file upload.

   IMPORTANT — Salla import flow:
   1. In Salla, download THEIR import template first (it has the exact columns
      + gray helper cells your store expects).
   2. Open salla-import.csv (this file). Copy each column into the matching
      column of Salla's template. Do NOT delete Salla's columns or edit gray
      cells. Multiple image URLs are comma-joined inside one quoted cell.
   3. Save Salla's template, upload, click تحديث/Update. Wait for processing.

   Prices track gold at build time. Re-run this before uploading if gold moved.
   ========================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");

/* ------------------------------------------------------------------ CONFIG */
const CONFIG = {
  PROXY_URL: "https://taj-gold-proxy.tajalamerahost.workers.dev/",
  GRAM_MIN: 150,
  GRAM_MAX: 900,
  ALLOW_STALE: process.env.FORCE_STALE === "1",

  // Keep IDENTICAL to price-sync.js + salla-create-products.js so the imported
  // launch price matches whatever the API sync would compute later. VAT 0 =
  // owner adds VAT in Salla dashboard. Override VAT_RATE=0.15 if Salla VAT OFF.
  VAT_RATE: process.env.VAT_RATE != null ? Number(process.env.VAT_RATE) : 0,
  PROFIT_TIERS: [
    { maxG: 5,        perGram: 0 },
    { maxG: 10,       perGram: 0 },
    { maxG: 20,       perGram: 0 },
    { maxG: Infinity, perGram: 0 }
  ],

  // Launch hidden so owner reviews specs before public. "sale" = live now.
  STATUS: process.env.STATUS || "hidden",

  SEED: path.join(__dirname, "seed-products.json"),
  OUT:  path.join(__dirname, "salla-import.csv"),
};

/* ----------------------------------------------------------------- HELPERS */
function round2(n) { return Math.round(n * 100) / 100; }

function profitPerGram(weight) {
  for (const t of CONFIG.PROFIT_TIERS) { if (weight <= t.maxG) return t.perGram || 0; }
  return 0;
}

function computePrice(gram, p) {
  const g = gram[p.karat];
  if (typeof g !== "number" || isNaN(g)) throw new Error(`no gram price for karat ${p.karat}`);
  const goldValue = g * p.weight;
  let making = 0;
  if (p.making.type === "per_gram") making = p.making.value * p.weight;
  else if (p.making.type === "fixed") making = p.making.value;
  else throw new Error(`bad making type: ${p.making.type}`);
  const stones = p.stones || 0;
  const profit = profitPerGram(p.weight) * p.weight;
  const subtotal = goldValue + making + stones + profit;
  return round2(subtotal * (1 + CONFIG.VAT_RATE));
}

async function getGramPrices() {
  const r = await fetch(CONFIG.PROXY_URL, { cache: "no-store" });
  if (!r.ok) throw new Error(`proxy HTTP ${r.status}`);
  const data = await r.json();
  if (!data || !data.ok || !data.prices) throw new Error("proxy returned not-ok / no prices");
  if (data.stale && !CONFIG.ALLOW_STALE) throw new Error("proxy price STALE. FORCE_STALE=1 to override.");
  for (const k of ["24k", "21k", "18k"]) {
    const v = Number(data.prices[k]);
    if (isNaN(v) || v < CONFIG.GRAM_MIN || v > CONFIG.GRAM_MAX)
      throw new Error(`gram ${k}=${data.prices[k]} outside [${CONFIG.GRAM_MIN}-${CONFIG.GRAM_MAX}]. ABORT.`);
  }
  return { "24k": Number(data.prices["24k"]), "21k": Number(data.prices["21k"]), "18k": Number(data.prices["18k"]), time: data.time };
}

// RFC-4180 CSV cell: wrap in quotes, double any inner quotes.
function csv(v) {
  const s = v == null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

/* ------------------------------------------------------------------- MAIN */
async function main() {
  let seed;
  try { seed = JSON.parse(fs.readFileSync(CONFIG.SEED, "utf8")); }
  catch (e) { console.error("cannot read seed-products.json:", e.message); process.exit(1); }
  if (!Array.isArray(seed) || !seed.length) { console.error("seed empty."); process.exit(1); }

  let gram;
  try { gram = await getGramPrices(); }
  catch (e) { console.error("gram fetch FAILED:", e.message); process.exit(1); }
  console.log(`Gram (SAR): 24k=${gram["24k"]}  21k=${gram["21k"]}  18k=${gram["18k"]}  time=${gram.time}`);

  // Column headers — Arabic labels matching Salla's import template fields.
  // (اسم المنتج / السعر / الكمية / رمز المنتج SKU / الوزن / الوصف / التصنيف /
  //  الحالة / روابط الصور). Owner pastes these into Salla's downloaded template.
  const header = [
    "اسم المنتج",       // name
    "السعر",            // price (SAR, VAT-inclusive per formula)
    "الكمية",           // quantity
    "رمز المنتج",       // sku
    "الوزن (جرام)",     // weight grams
    "الوصف",            // description
    "التصنيف",          // category (arabic name)
    "الحالة",           // status: مخفي(hidden) / معروض(sale)
    "روابط الصور"       // image URLs, comma-joined
  ];

  const statusAr = CONFIG.STATUS === "sale" ? "معروض" : "مخفي";
  const rows = [header.map(csv).join(",")];

  let ok = 0, failed = 0;
  for (const p of seed) {
    let price;
    try { price = computePrice(gram, p); }
    catch (e) { console.error(`P${p.folder} ${p.name}: ${e.message}`); failed++; continue; }

    const karatLabel = { "24k": "24", "21k": "21", "18k": "18" }[p.karat] || p.karat;
    const desc = p.placeholder
      ? `${p.name} — عيار ${karatLabel} — وزن تقريبي ${p.weight} جم. السعر محسوب من سعر الجرام المباشر. (بيانات مبدئية تُحدّث لاحقاً)`
      : `${p.name} — عيار ${karatLabel} — ${p.weight} جم.`;
    const imgs = (p.gallery && p.gallery.length ? p.gallery : [p.hero]).filter(Boolean).join(",");

    rows.push([
      p.name,
      price,
      p.quantity != null ? p.quantity : 1,
      p.sku,
      p.weight,
      desc,
      p.category_ar,
      statusAr,
      imgs
    ].map(csv).join(","));
    ok++;
    console.log(`P${p.folder} ${p.name}  ${p.karat} ${p.weight}g  ->  ${price} SAR`);
  }

  // UTF-8 BOM so Excel opens Arabic correctly.
  fs.writeFileSync(CONFIG.OUT, "\ufeff" + rows.join("\r\n") + "\r\n", "utf8");
  console.log("-".repeat(64));
  console.log(`Wrote ${ok} products -> ${CONFIG.OUT}  (status: ${statusAr}, VAT: ${CONFIG.VAT_RATE})`);
  if (failed) { console.error(`${failed} failed.`); process.exitCode = 2; }
}

main().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
