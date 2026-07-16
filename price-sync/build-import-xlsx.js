#!/usr/bin/env node
/* ==========================================================================
   TAJ ALAMEERA — Salla Product-Import XLSX Builder
   --------------------------------------------------------------------------
   Fills Salla's OWN downloaded import template (product-sample.xlsx) with our
   28 products + live-gold launch prices, so the owner just uploads the result.
   Keeps Salla's styling / header rows / dropdown validation intact by only
   rewriting the data rows inside <sheetData> (using inline strings, so the
   shared-strings table is left untouched).

   Runs against an UNZIPPED copy of the template. The wrapper (build-xlsx.sh)
   copies the template, unzips, runs this, rezips to salla-import.xlsx.

   Env:
     WORKDIR   unzipped template dir (default /tmp/salla-xlsx-build)
     STATUS    unused here (Salla import has no status col; flip in dashboard)
     VAT_RATE  default 0.15  (set 0 if Salla adds VAT itself at checkout)
   ========================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");

const CONFIG = {
  PROXY_URL: "https://taj-gold-proxy.tajalamerahost.workers.dev/",
  GRAM_MIN: 150, GRAM_MAX: 900,
  ALLOW_STALE: process.env.FORCE_STALE === "1",
  // VAT 0 = owner adds VAT in Salla dashboard at checkout (avoid double-charge).
  // Override VAT_RATE=0.15 only if Salla VAT is turned OFF.
  VAT_RATE: process.env.VAT_RATE != null ? Number(process.env.VAT_RATE) : 0,
  PROFIT_TIERS: [
    { maxG: 5, perGram: 0 }, { maxG: 10, perGram: 0 },
    { maxG: 20, perGram: 0 }, { maxG: Infinity, perGram: 0 }
  ],
  SEED: path.join(__dirname, "seed-products.json"),
  WORKDIR: process.env.WORKDIR || "/tmp/salla-xlsx-build",
};

// Map our seed category_ar -> Salla store's exact category name.
const CAT_MAP = {
  "أساور": "أساور",
  "سلاسل": "سلاسل وعقود",
  "خواتم": "خواتم",
};

function round2(n) { return Math.round(n * 100) / 100; }
function round4(n) { return Math.round(n * 10000) / 10000; }
function profitPerGram(w) { for (const t of CONFIG.PROFIT_TIERS) if (w <= t.maxG) return t.perGram || 0; return 0; }

function computePrice(gram, p) {
  const g = gram[p.karat];
  if (typeof g !== "number" || isNaN(g)) throw new Error(`no gram price karat ${p.karat}`);
  const gold = g * p.weight;
  let making = 0;
  if (p.making.type === "per_gram") making = p.making.value * p.weight;
  else if (p.making.type === "fixed") making = p.making.value;
  else throw new Error(`bad making type ${p.making.type}`);
  const profit = profitPerGram(p.weight) * p.weight;
  return round2((gold + making + (p.stones || 0) + profit) * (1 + CONFIG.VAT_RATE));
}

async function getGram() {
  const r = await fetch(CONFIG.PROXY_URL, { cache: "no-store" });
  if (!r.ok) throw new Error(`proxy HTTP ${r.status}`);
  const d = await r.json();
  if (!d || !d.ok || !d.prices) throw new Error("proxy not-ok");
  if (d.stale && !CONFIG.ALLOW_STALE) throw new Error("proxy STALE. FORCE_STALE=1 to override.");
  for (const k of ["24k", "21k", "18k"]) {
    const v = Number(d.prices[k]);
    if (isNaN(v) || v < CONFIG.GRAM_MIN || v > CONFIG.GRAM_MAX)
      throw new Error(`gram ${k}=${d.prices[k]} outside bounds. ABORT.`);
  }
  return { "24k": +d.prices["24k"], "21k": +d.prices["21k"], "18k": +d.prices["18k"], time: d.time };
}

function xesc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
const COL = ["", "A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S"];
function cellText(col, row, val) {
  return `<c r="${col}${row}" t="inlineStr"><is><t xml:space="preserve">${xesc(val)}</t></is></c>`;
}
function cellNum(col, row, val) {
  return `<c r="${col}${row}"><v>${val}</v></c>`;
}

function buildRow(rowNum, p, price) {
  const karat = { "24k": "24", "21k": "21", "18k": "18" }[p.karat] || p.karat;
  const cat = CAT_MAP[p.category_ar] || p.category_ar;
  const desc = p.placeholder
    ? `${p.name} - عيار ${karat} - وزن تقريبي ${p.weight} جم. السعر محسوب من سعر الجرام المباشر. (بيانات مبدئية تُحدّث لاحقاً)`
    : `${p.name} - عيار ${karat} - ${p.weight} جم.`;
  const imgs = (p.gallery && p.gallery.length ? p.gallery : [p.hero]).filter(Boolean).join(",");
  const kg = round4(p.weight / 1000); // grams -> kg for Salla shipping weight

  const cells = [
    cellText("A", rowNum, "منتج"),           // النوع
    cellText("B", rowNum, p.name),            // أسم المنتج
    cellText("C", rowNum, cat),               // تصنيف المنتج
    cellText("D", rowNum, imgs),              // صورة المنتج (comma-joined URLs)
    cellText("E", rowNum, p.name),            // وصف صورة المنتج (alt)
    cellText("F", rowNum, "منتج جاهز"),       // نوع المنتج
    cellNum ("G", rowNum, price),             // سعر المنتج
    cellText("H", rowNum, desc),              // الوصف
    cellText("I", rowNum, "نعم"),             // هل يتطلب شحن؟
    cellText("J", rowNum, p.sku),             // رمز المنتج sku
    // K سعر التكلفة, L السعر المخفض, M/N تواريخ, O اقصي كمية, P/Q  -> leave blank
    cellNum ("R", rowNum, kg),                // الوزن (kg)
    cellText("S", rowNum, "kg"),              // وحدة الوزن
  ];
  return `<row r="${rowNum}" spans="1:40">${cells.join("")}</row>`;
}

async function main() {
  const sheetPath = path.join(CONFIG.WORKDIR, "xl", "worksheets", "sheet1.xml");
  if (!fs.existsSync(sheetPath)) { console.error("missing", sheetPath, "- run build-xlsx.sh"); process.exit(1); }

  let seed;
  try { seed = JSON.parse(fs.readFileSync(CONFIG.SEED, "utf8")); }
  catch (e) { console.error("seed read fail:", e.message); process.exit(1); }

  const gram = await getGram();
  console.log(`Gram (SAR): 24k=${gram["24k"]} 21k=${gram["21k"]} 18k=${gram["18k"]}  time=${gram.time}`);

  let xml = fs.readFileSync(sheetPath, "utf8");

  // Extract the original header rows 1 & 2 verbatim (keep Salla's exact headers).
  const m1 = xml.match(/<row r="1"[\s\S]*?<\/row>/);
  const m2 = xml.match(/<row r="2"[\s\S]*?<\/row>/);
  if (!m1 || !m2) { console.error("could not find header rows 1/2 in template"); process.exit(1); }

  let ok = 0, failed = 0, rowNum = 3;
  const dataRows = [];
  for (const p of seed) {
    let price;
    try { price = computePrice(gram, p); }
    catch (e) { console.error(`P${p.folder} ${p.name}: ${e.message}`); failed++; continue; }
    dataRows.push(buildRow(rowNum, p, price));
    console.log(`row ${rowNum}: P${p.folder} ${p.name}  ${p.karat} ${p.weight}g -> ${price} SAR  [${CAT_MAP[p.category_ar] || p.category_ar}]`);
    rowNum++; ok++;
  }

  const newSheetData = `<sheetData>${m1[0]}${m2[0]}${dataRows.join("")}</sheetData>`;
  xml = xml.replace(/<sheetData>[\s\S]*?<\/sheetData>/, newSheetData);
  // Fix the dimension ref to cover our rows (cosmetic; Excel recalculates anyway).
  xml = xml.replace(/<dimension ref="[^"]*"\/>/, `<dimension ref="A1:AN${rowNum - 1}"/>`);

  fs.writeFileSync(sheetPath, xml, "utf8");
  console.log("-".repeat(64));
  console.log(`Wrote ${ok} product rows into ${sheetPath}  (VAT ${CONFIG.VAT_RATE})`);
  if (failed) { console.error(`${failed} failed.`); process.exitCode = 2; }
}

main().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
