#!/usr/bin/env node
/* ==========================================================================
   TAJ ALAMEERA — Gold Price Sync Engine
   --------------------------------------------------------------------------
   Computes each product's price from LIVE gram price and pushes it into Salla
   so the DISPLAYED price and the CHECKOUT price are ALWAYS identical.

   price = ((live_gram_price[karat] * weight_g) + making_charge) * (1 + VAT)

   SAFETY FIRST. Money code. Read the guards below before running for real.
   Default mode = DRY_RUN (computes + prints, writes NOTHING to Salla).
   ========================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");

/* ------------------------------------------------------------------ CONFIG */
const CONFIG = {
  // Live gram-price proxy (same source the storefront ticker uses).
  PROXY_URL: "https://taj-gold-proxy.tajalamerahost.workers.dev/",

  // Salla Merchant API. Token comes from ENV — never hardcode a token here.
  //   export SALLA_API_TOKEN="xxxxx"
  SALLA_API_BASE: "https://api.salla.dev/admin/v2",
  SALLA_API_TOKEN: process.env.SALLA_API_TOKEN || "",

  // MASTER SWITCH. true = compute + print only, write NOTHING. Keep true until verified.
  DRY_RUN: process.env.LIVE === "1" ? false : true,

  // ---- SANITY GUARDS (refuse to push nonsense prices) ----
  // Gram price outside these bounds (SAR) => abort. Protects vs proxy returning 0 / garbage.
  GRAM_MIN: 150,
  GRAM_MAX: 900,
  // If proxy says stale:true, refuse to push unless FORCE_STALE=1 (stale = old number, risky).
  ALLOW_STALE: process.env.FORCE_STALE === "1",
  // Reject a computed price if it moved more than this fraction vs the current Salla price.
  // Catches a bad weight/karat typo before it nukes a real price. 0.35 = 35%.
  MAX_MOVE_FRAC: 0.35,
  // Ignore MAX_MOVE_FRAC on first run when Salla price is 0/placeholder.

  // ---- VAT ----
  // KSA VAT rate. 0.15 = 15%. Set 0 if Salla adds VAT itself at checkout
  // (avoid double-charging). CONFIRM with owner how VAT is handled in Salla.
  VAT_RATE: 0.15,
};

/* --------------------------------------------------------------- PRODUCTS */
/* One entry per product. Fill from OWNER-PRODUCT-DATA sheet.
   - id:       Salla product id (from Salla dashboard / API). REQUIRED to push.
   - name:     human label (logs only).
   - karat:    "24k" | "21k" | "18k"  (must match proxy keys).
   - weight:   grams (number).
   - making:   { type: "per_gram" | "fixed", value: SAR }.
   - stones:   optional flat SAR added on top (diamonds etc). Default 0.
   Products with id:null are SKIPPED (data not in Salla yet).

   AUTO-LOADED from seed-products.json + salla-id-map.json (written by
   salla-create-products.js). Each seed entry is joined to its Salla id via
   the folder number. Products not yet created (no map entry) get id:null and
   are skipped. To override with a hand-edited list, set PRODUCTS below. */
function loadProducts() {
  let seed = [], map = {};
  try { seed = JSON.parse(fs.readFileSync(path.join(__dirname, "seed-products.json"), "utf8")); }
  catch { return []; }
  try { map = JSON.parse(fs.readFileSync(path.join(__dirname, "salla-id-map.json"), "utf8")); }
  catch { map = {}; }
  return seed.map((p) => ({
    id: map[p.folder] != null ? map[p.folder] : null,
    name: p.name,
    karat: p.karat,
    weight: p.weight,
    making: p.making,
    stones: p.stones || 0
  }));
}
const PRODUCTS = loadProducts();

/* ----------------------------------------------------------------- HELPERS */
function log(...a) { console.log(...a); }
function err(...a) { console.error("  \u2717", ...a); }
function ok(...a)  { console.log("  \u2713", ...a); }

function round2(n) { return Math.round(n * 100) / 100; }

function computePrice(gram, p) {
  const g = gram[p.karat];
  if (typeof g !== "number" || isNaN(g)) throw new Error(`no gram price for karat ${p.karat}`);
  const goldValue = g * p.weight;
  let making = 0;
  if (p.making.type === "per_gram") making = p.making.value * p.weight;
  else if (p.making.type === "fixed") making = p.making.value;
  else throw new Error(`bad making type: ${p.making.type}`);
  const stones = p.stones || 0;
  const subtotal = goldValue + making + stones;
  const vat = subtotal * CONFIG.VAT_RATE;
  const total = round2(subtotal + vat);
  return {
    total,
    breakdown: {
      gold: round2(goldValue), making: round2(making),
      stones: round2(stones), vat: round2(vat)
    }
  };
}

/* ------------------------------------------------------------------- FETCH */
async function getGramPrices() {
  const r = await fetch(CONFIG.PROXY_URL, { cache: "no-store" });
  if (!r.ok) throw new Error(`proxy HTTP ${r.status}`);
  const data = await r.json();
  if (!data || !data.ok || !data.prices) throw new Error("proxy returned not-ok / no prices");

  // stale guard
  if (data.stale && !CONFIG.ALLOW_STALE) {
    throw new Error("proxy price is STALE. Refusing to sync. Set FORCE_STALE=1 to override.");
  }
  // bounds guard on every karat
  for (const k of ["24k", "21k", "18k"]) {
    const v = Number(data.prices[k]);
    if (isNaN(v) || v < CONFIG.GRAM_MIN || v > CONFIG.GRAM_MAX) {
      throw new Error(`gram price ${k}=${data.prices[k]} outside safe bounds [${CONFIG.GRAM_MIN}-${CONFIG.GRAM_MAX}]. ABORT.`);
    }
  }
  return {
    "24k": Number(data.prices["24k"]),
    "21k": Number(data.prices["21k"]),
    "18k": Number(data.prices["18k"]),
    time: data.time, stale: !!data.stale
  };
}

/* -------------------------------------------------------------- SALLA API */
async function getSallaProduct(id) {
  const r = await fetch(`${CONFIG.SALLA_API_BASE}/products/${id}`, {
    headers: { Authorization: `Bearer ${CONFIG.SALLA_API_TOKEN}`, Accept: "application/json" }
  });
  if (!r.ok) throw new Error(`GET product ${id} -> HTTP ${r.status}`);
  const j = await r.json();
  return j.data;
}

async function putSallaPrice(id, price) {
  const r = await fetch(`${CONFIG.SALLA_API_BASE}/products/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${CONFIG.SALLA_API_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({ price })
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`PUT product ${id} price -> HTTP ${r.status} ${t.slice(0, 200)}`);
  }
  return true;
}

/* ------------------------------------------------------------------- MAIN */
async function main() {
  log("=".repeat(64));
  log("TAJ ALAMEERA price-sync  |  mode:", CONFIG.DRY_RUN ? "DRY_RUN (no writes)" : "*** LIVE (WILL WRITE) ***");
  log("=".repeat(64));

  if (!CONFIG.DRY_RUN && !CONFIG.SALLA_API_TOKEN) {
    err("LIVE mode but SALLA_API_TOKEN missing. Set env var. ABORT.");
    process.exit(1);
  }
  if (PRODUCTS.length === 0) {
    log("No products configured yet. Fill PRODUCTS[] from owner sheet. Nothing to do.");
    return;
  }

  let gram;
  try {
    gram = await getGramPrices();
  } catch (e) {
    err("Gram price fetch FAILED:", e.message);
    process.exit(1);
  }
  log(`Gram (SAR): 24k=${gram["24k"]}  21k=${gram["21k"]}  18k=${gram["18k"]}  stale=${gram.stale}`);
  log(`Source time: ${gram.time}`);
  log("-".repeat(64));

  let done = 0, skipped = 0, failed = 0, wouldWrite = 0;

  for (const p of PRODUCTS) {
    const tag = `[${p.name || p.id}]`;

    if (!p.id) { log(`SKIP ${tag} no Salla id yet`); skipped++; continue; }

    let computed, bd;
    try {
      const res = computePrice(gram, p);
      computed = res.total; bd = res.breakdown;
    } catch (e) {
      err(`${tag} compute error: ${e.message}`); failed++; continue;
    }

    // Fetch current Salla price for the move-guard.
    let current = null;
    if (!CONFIG.DRY_RUN || CONFIG.SALLA_API_TOKEN) {
      try {
        const sp = await getSallaProduct(p.id);
        current = Number(sp && (sp.price && sp.price.amount != null ? sp.price.amount : sp.price));
        if (isNaN(current)) current = null;
      } catch (e) {
        err(`${tag} could not read current Salla price: ${e.message}`);
      }
    }

    // Move guard: block huge jumps (typo protection) unless current is 0/placeholder.
    if (current && current > 0) {
      const move = Math.abs(computed - current) / current;
      if (move > CONFIG.MAX_MOVE_FRAC) {
        err(`${tag} price move ${(move * 100).toFixed(1)}% (${current} -> ${computed}) exceeds ${(CONFIG.MAX_MOVE_FRAC * 100)}%. BLOCKED. Check weight/karat/making.`);
        failed++; continue;
      }
    }

    // No-op guard: price already correct. Critical for 1-min cadence — skips the
    // write when gold hasn't moved, so we don't hammer Salla's API with identical PUTs.
    if (current != null && round2(current) === computed) {
      log(`SAME ${tag} ${p.karat} ${p.weight}g  already ${computed} SAR (no write)`);
      skipped++;
      continue;
    }

    if (CONFIG.DRY_RUN) {
      log(`DRY  ${tag} ${p.karat} ${p.weight}g  current=${current ?? "?"}  ->  ${computed} SAR ` +
          `(ذهب ${bd.gold} + صنعة ${bd.making}` + (bd.stones ? ` + أحجار ${bd.stones}` : "") + ` + ضريبة ${bd.vat})`);
      wouldWrite++;
      continue;
    }

    // LIVE write
    try {
      await putSallaPrice(p.id, computed);
      ok(`${tag} ${current ?? "?"} -> ${computed} SAR written`);
      done++;
    } catch (e) {
      err(`${tag} write FAILED: ${e.message}`); failed++;
    }
  }

  log("-".repeat(64));
  if (CONFIG.DRY_RUN) log(`DRY_RUN complete. Would write ${wouldWrite}. Skipped ${skipped}. Errors ${failed}.`);
  else log(`LIVE complete. Wrote ${done}. Skipped ${skipped}. Errors ${failed}.`);
  log("=".repeat(64));
  if (failed > 0) process.exitCode = 2;
}

main().catch((e) => { err("FATAL:", e.message); process.exit(1); });
