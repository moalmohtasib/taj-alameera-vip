#!/usr/bin/env node
/* ==========================================================================
   TAJ ALAMEERA — Seed Data Builder
   --------------------------------------------------------------------------
   Scans products/_web/*.webp + product mds, emits price-sync/seed-products.json:
   one object per product with category, placeholder specs (weight/karat/making),
   hero + gallery CDN image URLs (jsDelivr on the git repo).

   Placeholder specs are SAFE defaults so the store looks complete + prices
   live-correctly today. Owner edits the real weight/karat/making later; rerun
   this + the create/sync scripts to update.
   ========================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const WEB = path.join(ROOT, "products", "_web");

// jsDelivr serves any public GitHub repo file as a CDN URL:
//   https://cdn.jsdelivr.net/gh/<user>/<repo>@<branch>/<path>
const CDN = "https://cdn.jsdelivr.net/gh/moalmohtasib/taj-alameera-vip@master/products/_web/";

// Salla category ids (from salla-inject CATEGORIES).
const CAT = {
  rings:     { id: 1807821848, ar: "خواتم" },
  bracelets: { id: 395012634,  ar: "أساور" },
  chains:    { id: 1632733467, ar: "سلاسل" },
  kids:      { id: 219920229,  ar: "أطفال" },
  goldbars:  { id: 1591793254, ar: "سبائك" }
};

// Per-product: category + arabic name + karat + placeholder weight(g) + making(SAR/gram).
// Placeholders are typical KSA gold-shop values; OWNER replaces with real numbers.
// making per_gram defaults: rings 45, bracelets 40, chains 35, sets 45.
const P = {
  1:  { c:"bracelets", n:"إسورة ذهب فاخرة", k:"21k", w:12,  m:40, kind:"إسورة" },
  2:  { c:"bracelets", n:"إسورة ذهب بحبات البرسيم", k:"21k", w:14,  m:40, kind:"إسورة" },
  3:  { c:"bracelets", n:"إسورة كف ذهب بلونين", k:"21k", w:18,  m:42, kind:"إسورة كف" },
  4:  { c:"bracelets", n:"إسورة ذهب بحبات مزخرفة", k:"21k", w:13,  m:40, kind:"إسورة" },
  5:  { c:"bracelets", n:"طقم ذهب فيليغرين (إسورة وخاتم)", k:"21k", w:16, m:45, kind:"طقم" },
  6:  { c:"bracelets", n:"طقم ذهب بنقشة سداسية (إسورة وخاتم)", k:"21k", w:17, m:45, kind:"طقم" },
  7:  { c:"bracelets", n:"طقم ذهب بنقشة المسمار (إسورة وخاتم)", k:"21k", w:19, m:45, kind:"طقم" },
  8:  { c:"bracelets", n:"إسورة ذهب مجدولة بلونين", k:"21k", w:15,  m:42, kind:"إسورة" },
  9:  { c:"bracelets", n:"طقم ذهب بتصميم ملفوف (إسورة وخاتم)", k:"21k", w:16, m:45, kind:"طقم" },
  10: { c:"chains",    n:"سلسلة ذهب بتعليقة بيضاوية", k:"18k", w:8,  m:35, kind:"سلسلة" },
  11: { c:"chains",    n:"سلسلة ذهب بتعليقات ألماس", k:"18k", w:7,  m:38, kind:"سلسلة", stones:true },
  12: { c:"chains",    n:"سلسلة ذهب بحبات وتعليقات", k:"18k", w:9,  m:35, kind:"سلسلة" },
  13: { c:"chains",    n:"سلسلة ذهب بلونين", k:"18k", w:8,  m:36, kind:"سلسلة" },
  14: { c:"chains",    n:"سلسلة ذهب ناعمة بسيطة", k:"18k", w:6,  m:35, kind:"سلسلة" },
  15: { c:"chains",    n:"سلسلة ذهب بتعليقة حجر كريم", k:"18k", w:9,  m:38, kind:"سلسلة", stones:true },
  16: { c:"chains",    n:"سلسلة ذهب بميدالية وحجر", k:"18k", w:10, m:38, kind:"سلسلة", stones:true },
  17: { c:"chains",    n:"سلسلة ذهب بحبات الفيروز", k:"18k", w:9,  m:38, kind:"سلسلة", stones:true },
  18: { c:"rings",     n:"خاتم ذهب بتصميم ملتوٍ", k:"21k", w:5,  m:45, kind:"خاتم" },
  19: { c:"rings",     n:"خاتم ذهب مفتوح", k:"21k", w:5,  m:45, kind:"خاتم" },
  20: { c:"rings",     n:"خاتم ذهب بتصميم سلسلة", k:"21k", w:6,  m:45, kind:"خاتم" },
  21: { c:"rings",     n:"خاتم ذهب بحلقات متصلة", k:"21k", w:6,  m:45, kind:"خاتم" },
  22: { c:"rings",     n:"خاتم ذهب مفرّغ", k:"21k", w:5,  m:45, kind:"خاتم" },
  23: { c:"rings",     n:"خاتم ذهب عريض", k:"21k", w:6,  m:45, kind:"خاتم" },
  24: { c:"rings",     n:"خاتم ذهب مجدول", k:"21k", w:5,  m:45, kind:"خاتم" },
  25: { c:"rings",     n:"خاتم ذهب بنقشة إغريقية", k:"21k", w:6,  m:45, kind:"خاتم" },
  26: { c:"rings",     n:"خاتم ذهب هندسي", k:"21k", w:6,  m:45, kind:"خاتم" },
  27: { c:"rings",     n:"خاتم ذهب بحواف مزخرفة", k:"21k", w:6,  m:45, kind:"خاتم" },
  28: { c:"bracelets", n:"إسورة ذهب بحبات وأحجار", k:"21k", w:14, m:42, kind:"إسورة", stones:true }
};

const KARAT_LABEL = { "24k":"24", "21k":"21", "18k":"18" };
const SKU_KIND = { "خاتم":"R", "إسورة":"B", "إسورة كف":"B", "سلسلة":"N", "طقم":"S" };

function imgsFor(n) {
  const all = fs.readdirSync(WEB).filter(f => f.startsWith(`p${n}-`) && f.endsWith(".webp"));
  // hero: prefer a woman/model wearing shot, then set/linen, then anything not "-detail"
  const rank = f => {
    if (/woman|model|hand/.test(f)) return 0;
    if (/set|linen|travertine/.test(f)) return 1;
    if (/detail/.test(f)) return 3;
    return 2;
  };
  all.sort((a,b) => rank(a)-rank(b) || a.localeCompare(b));
  return all;
}

function build() {
  if (!fs.existsSync(WEB)) { console.error("missing", WEB); process.exit(1); }
  const out = [];
  for (let n = 1; n <= 28; n++) {
    const spec = P[n];
    if (!spec) continue;
    const cat = CAT[spec.c];
    const imgs = imgsFor(n);
    if (!imgs.length) { console.error(`P${n}: no images`); }
    const sku = `${SKU_KIND[spec.kind]||"X"}-${KARAT_LABEL[spec.k]}Y-${String(Math.round(spec.w*100)).padStart(4,"0")}-${n}`;
    out.push({
      folder: n,
      name: spec.n,
      category_id: cat.id,
      category_ar: cat.ar,
      karat: spec.k,
      weight: spec.w,
      making: { type: "per_gram", value: spec.m },
      stones: spec.stones ? 0 : 0,   // owner sets real stone SAR if any
      hasStones: !!spec.stones,
      sku,
      quantity: 1,
      hero: imgs.length ? CDN + imgs[0] : "",
      gallery: imgs.map(f => CDN + f),
      placeholder: true              // flag: specs are defaults, owner must confirm
    });
  }
  const dest = path.join(__dirname, "seed-products.json");
  fs.writeFileSync(dest, JSON.stringify(out, null, 2));
  console.log(`wrote ${out.length} products -> ${dest}`);
  console.log("categories:", [...new Set(out.map(p=>p.category_ar))].join(", "));
  const withStones = out.filter(p=>p.hasStones).length;
  console.log(`${withStones} flagged has-stones (owner to price stones).`);
}
build();
