#!/usr/bin/env node
/* ==========================================================================
   TAJ ALAMEERA — Salla Product Auto-Creator
   --------------------------------------------------------------------------
   Reads price-sync/seed-products.json and creates each product in Salla via
   the Merchant API. Computes a launch price from the LIVE gram price so the
   store looks correct from minute one. Writes a folder->salla_id map to
   price-sync/salla-id-map.json so price-sync.js can push live prices after.

   SAFETY. Money + store-writing code.
   Default mode = DRY_RUN (prints the exact JSON body, writes NOTHING).
   Run for real only with:  LIVE=1 SALLA_API_TOKEN=xxxxx node salla-create-products.js

   Idempotency: if a folder already has an id in salla-id-map.json, it is
   SKIPPED (won't create a duplicate). Delete its map entry to recreate.
   ========================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");

/* ------------------------------------------------------------------ CONFIG */
const CONFIG = {
  PROXY_URL: "https://taj-gold-proxy.tajalamerahost.workers.dev/",
  SALLA_API_BASE: "https://api.salla.dev/admin/v2",
  SALLA_API_TOKEN: process.env.SALLA_API_TOKEN || "",

  // MASTER SWITCH. true = print only, create NOTHING. LIVE=1 to actually create.
  DRY_RUN: process.env.LIVE === "1" ? false : true,

  // Gram-price sanity bounds (SAR). Outside => abort (protects vs garbage proxy).
  GRAM_MIN: 150,
  GRAM_MAX: 900,
  ALLOW_STALE: process.env.FORCE_STALE === "1",

  // KSA VAT. Owner adds VAT from Salla dashboard at checkout, so push VAT-
  // EXCLUSIVE (0) to avoid double-charge. Same default as price-sync.js — keep
  // identical. Override VAT_RATE=0.15 only if Salla VAT is OFF.
  VAT_RATE: process.env.VAT_RATE != null ? Number(process.env.VAT_RATE) : 0,

  // Profit-per-gram tiers by weight. MUST match price-sync.js so launch price ==
  // sync price. All 0 until owner sends real tiers (no profit added for now).
  PROFIT_TIERS: [
    { maxG: 5,        perGram: 0 },
    { maxG: 10,       perGram: 0 },
    { maxG: 20,       perGram: 0 },
    { maxG: Infinity, perGram: 0 }
  ],

  // Launch products as "hidden" so owner reviews before they go public.
  // Set STATUS=sale to publish immediately.
  STATUS: process.env.STATUS || "hidden",

  SEED: path.join(__dirname, "seed-products.json"),
  ID_MAP: path.join(__dirname, "salla-id-map.json"),
};

/* ----------------------------------------------------------------- HELPERS */
function log(...a) { console.log(...a); }
function err(...a) { console.error("  \u2717", ...a); }
function ok(...a)  { console.log("  \u2713", ...a); }
function round2(n) { return Math.round(n * 100) / 100; }

function profitPerGram(weight) {
  const tiers = CONFIG.PROFIT_TIERS || [];
  for (const t of tiers) { if (weight <= t.maxG) return t.perGram || 0; }
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
  const total = round2(subtotal * (1 + CONFIG.VAT_RATE));
  return { total, breakdown: { gold: round2(goldValue), making: round2(making), stones: round2(stones), profit: round2(profit) } };
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

function loadIdMap() {
  try { return JSON.parse(fs.readFileSync(CONFIG.ID_MAP, "utf8")); }
  catch { return {}; }
}
function saveIdMap(m) {
  fs.writeFileSync(CONFIG.ID_MAP, JSON.stringify(m, null, 2));
}

/* -------------------------------------------------------------- SALLA API */
async function createSallaProduct(body) {
  const r = await fetch(`${CONFIG.SALLA_API_BASE}/products`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CONFIG.SALLA_API_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify(body)
  });
  const t = await r.text();
  let j = null; try { j = JSON.parse(t); } catch {}
  if (!r.ok) throw new Error(`POST /products -> HTTP ${r.status} ${t.slice(0, 300)}`);
  const id = j && j.data && j.data.id;
  if (!id) throw new Error(`created but no id in response: ${t.slice(0, 200)}`);
  return id;
}

/* Build the Salla ProductCreate body from a seed entry + launch price. */
function buildBody(p, price) {
  const desc = p.placeholder
    ? `${p.name} — ${p.karat} — وزن تقريبي ${p.weight} جم. السعر محسوب من سعر الجرام المباشر. (بيانات مبدئية، تُحدّث لاحقاً)`
    : `${p.name} — ${p.karat} — ${p.weight} جم.`;
  return {
    name: p.name,
    price: price,
    product_type: "product",
    status: CONFIG.STATUS,
    quantity: p.quantity != null ? p.quantity : 1,
    description: desc,
    sku: p.sku,
    categories: p.category_id ? [p.category_id] : [],
    weight: p.weight,
    weight_type: "gram",
    images: (p.gallery && p.gallery.length ? p.gallery : [p.hero])
      .filter(Boolean)
      .map((u, i) => ({ original: u, sort: i, default: i === 0 }))
  };
}

/* ------------------------------------------------------------------- MAIN */
async function main() {
  log("=".repeat(64));
  log("TAJ ALAMEERA create-products |", CONFIG.DRY_RUN ? "DRY_RUN (no writes)" : "*** LIVE (WILL CREATE) ***", "| status:", CONFIG.STATUS, "| VAT:", CONFIG.VAT_RATE);
  log("=".repeat(64));

  if (!CONFIG.DRY_RUN && !CONFIG.SALLA_API_TOKEN) {
    err("LIVE mode but SALLA_API_TOKEN missing. export SALLA_API_TOKEN=... . ABORT."); process.exit(1);
  }

  let seed;
  try { seed = JSON.parse(fs.readFileSync(CONFIG.SEED, "utf8")); }
  catch (e) { err("cannot read seed-products.json:", e.message); process.exit(1); }
  if (!Array.isArray(seed) || !seed.length) { err("seed empty."); process.exit(1); }

  let gram;
  try { gram = await getGramPrices(); }
  catch (e) { err("gram fetch FAILED:", e.message); process.exit(1); }
  log(`Gram (SAR): 24k=${gram["24k"]}  21k=${gram["21k"]}  18k=${gram["18k"]}`);
  log(`Source time: ${gram.time}`);
  log("-".repeat(64));

  const idMap = loadIdMap();
  let created = 0, skipped = 0, failed = 0, would = 0;

  for (const p of seed) {
    const tag = `[P${p.folder} ${p.name}]`;

    if (idMap[p.folder]) { log(`SKIP ${tag} already created id=${idMap[p.folder]}`); skipped++; continue; }

    let price, bd;
    try { const r = computePrice(gram, p); price = r.total; bd = r.breakdown; }
    catch (e) { err(`${tag} compute error: ${e.message}`); failed++; continue; }

    const body = buildBody(p, price);

    if (CONFIG.DRY_RUN) {
      log(`DRY  ${tag}`);
      log(`     price=${price} SAR (ذهب ${bd.gold} + صنعة ${bd.making}${bd.stones ? ` + أحجار ${bd.stones}` : ""} + ضريبة ${CONFIG.VAT_RATE * 100}%)`);
      log(`     cat=${p.category_id} sku=${p.sku} imgs=${body.images.length} status=${CONFIG.STATUS}`);
      would++;
      continue;
    }

    try {
      const id = await createSallaProduct(body);
      idMap[p.folder] = id;
      saveIdMap(idMap); // persist after EACH create so a crash never loses ids
      ok(`${tag} created id=${id} price=${price} SAR`);
      created++;
    } catch (e) {
      err(`${tag} create FAILED: ${e.message}`); failed++;
    }
  }

  log("-".repeat(64));
  if (CONFIG.DRY_RUN) log(`DRY_RUN complete. Would create ${would}. Skipped ${skipped}. Errors ${failed}.`);
  else log(`LIVE complete. Created ${created}. Skipped ${skipped}. Errors ${failed}. Map -> ${CONFIG.ID_MAP}`);
  log("=".repeat(64));
  if (failed > 0) process.exitCode = 2;
}

main().catch((e) => { err("FATAL:", e.message); process.exit(1); });
