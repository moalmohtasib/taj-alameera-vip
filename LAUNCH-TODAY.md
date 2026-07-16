# Taj Alameera — Launch TODAY (owner meeting)

Do-this-now checklist. Everything the code can do is done. This lists the few
manual Salla-dashboard steps + what to run + what data we still need from owner.

---

## What is ALREADY done (code)

- 28 products optimized (webp) + seed data built (`price-sync/seed-products.json`).
- Auto-create script ready (`price-sync/salla-create-products.js`) — dry-run tested, 0 errors.
- Live price-sync ready (`price-sync/price-sync.js`) — reads live gram price, keeps
  displayed price == checkout price. Dry-run tested.
- Storefront injection (`salla-inject/salla-inject.js`): brand look, live gold ticker,
  category popup, custom footer.
- Footer now carries owner data: phone, email, daily hours 4–11, Google-Maps link,
  الرقم الوطني الموحد 7002200579, CR + VAT numbers, updated gov QR image.
- Hero shows "نصنع الأناقة منذ عام ١٩٩٧".
- Images served via jsDelivr CDN (verified 200).

---

## FASTEST PATH — No token, no Partner, no approval (recommended for today)

Salla lets you bulk-upload products from a spreadsheet in the dashboard. No API
token, no Salla Partner account, no review. Best way to go live today.

1. In Salla: المنتجات → استيراد وتصدير → استيراد منتجات جديدة. Download Salla's
   own template (product-sample.xlsx). Save it to `~/Downloads/product-sample.xlsx`.
2. Build the ready-to-upload file (fills Salla's template, prices from live gold):
   ```
   cd price-sync
   /usr/bin/python3 build-import-xlsx.py
   ```
   Writes `price-sync/salla-import.xlsx` — a REAL Excel file (openpyxl) Salla
   accepts. 28 products, weight in kg. Category / product-type / brand columns
   are left BLANK by default (Salla rejects them in the sheet — "delete category
   type brand"). Assign category + type in the dashboard after import.
   Re-run right before uploading if gold moved. Uses `~/Downloads/product-sample.xlsx`
   by default; override with `TEMPLATE=/path/to/template.xlsx`.
   To keep category/type in the sheet instead: `BLANK_META=0 /usr/bin/python3 build-import-xlsx.py`.
   (Mac has openpyxl only under `/usr/bin/python3`, not the default `python3`.)
3. Upload `salla-import.xlsx` in Salla, click تحديث/Update. Wait for processing.
4. Bulk-select the imported products → assign تصنيف (أساور / سلاسل وعقود / خواتم)
   from the dashboard. Then flip مخفي → معروض to publish.

Note: the old hand-zipped xlsx (`build-xlsx.sh` + `build-import-xlsx.js`) was
rejected by Salla ("needs Microsoft Excel"). The Python builder replaces it.
`build-import-csv.js` (CSV) stays as a manual-paste fallback only.

Prices are static after import (they won't track gold). To auto-track gold you
need the API path below (STEP 1–3). CSV now, API later is fine.

---

## API PATH (optional, only if owner wants auto-repricing)

Private app on your OWN store = self-approved instantly, NO Salla review. Only
public App-Store listings need review. Token expires ~14 days (needs refresh
for long-term). Skip this entirely if the CSV path above is enough.

## STEP 1 — Get the Salla API token (owner + you, 2 min)

1. Salla dashboard → التطبيقات / Salla Partners → create a private app (or use an
   existing app token) with **Products read+write** scope.
2. Copy the access token.
3. In terminal:
   ```
   export SALLA_API_TOKEN="PASTE_TOKEN_HERE"
   ```

## STEP 2 — Create the 28 products in Salla

Dry-run first (writes nothing, just prints):
```
cd price-sync
node salla-create-products.js
```
Confirm the printed prices look sane. Then create for real (products land as
**hidden** so owner reviews before public):
```
LIVE=1 node salla-create-products.js
```
This writes `salla-id-map.json` (folder → Salla product id). Safe to re-run —
already-created products are skipped.

## STEP 3 — Turn on live price-sync

Dry-run (no writes):
```
node price-sync.js
```
Go live (writes prices into Salla):
```
LIVE=1 node price-sync.js
```
Run it on a schedule (cron / launchd) every 1–5 min so store price tracks gold.
No-op guard skips writes when gold hasn't moved, so it won't hammer the API.

## STEP 4 — Paste the storefront injection

Salla → تصميم المتجر → Advanced → Customize with JavaScript.
Paste the whole contents of `salla-inject/salla-inject.js`. Save. Hard-refresh store.

## STEP 5 — Dashboard settings (owner does in Salla, no code)

- **Payments:** enable **مدى (mada)** + **Apple Pay** (Salla → المدفوعات).
  Also VISA/Mastercard as available. Footer badges already show these.
- **Shipping:** enable **سمسا (SMSA)** + **أرامكس (Aramex)** (Salla → الشحن والتوصيل).
- Publish products (change from hidden → sale) after owner reviews specs.

---

## PENDING from owner (do NOT block launch, edit later)

1. **Real product specs** — current weight/karat/making are safe placeholders.
   Owner confirms real numbers → edit `price-sync/build-seed.js` (P table) →
   rerun `node build-seed.js` → rerun create/sync.
2. **Profit-margin tiers** — owner's formula:
   `(weight × gram price by karat) + making + PROFIT + VAT`, profit = per-gram,
   TIERED by weight. Scaffold is in place (`PROFIT_TIERS`) but all set to **0**
   for now (no profit added yet). When owner sends the tiers, fill `PROFIT_TIERS`
   in BOTH `price-sync.js` and `salla-create-products.js` (keep identical), e.g.:
   ```js
   PROFIT_TIERS: [
     { maxG: 5,        perGram: 30 },
     { maxG: 10,       perGram: 25 },
     { maxG: 20,       perGram: 20 },
     { maxG: Infinity, perGram: 15 }
   ]
   ```
3. ~~VAT handling~~ — DECIDED. Scripts now push VAT-EXCLUSIVE prices (VAT_RATE
   default = 0). Owner turns VAT ON in Salla (الإعدادات → الضريبة, 15%); Salla
   adds it at checkout. No double-charge. If Salla VAT is ever OFF, rebuild with
   `VAT_RATE=0.15 ./build-xlsx.sh`.
4. ~~New gov QR verify URL~~ — DONE. Footer shows owner's new QR image and links to
   the new Saudi Business Center verify URL.

---

## Owner data captured (for reference)

- Hours: يومياً ٤ عصراً – ١١ مساءً
- WhatsApp/phone: 0553823281 · Email: Tajalameeera@gmail.com
- Location: مجوهرات تاج الاميرة — https://maps.app.goo.gl/sh19ZjqhaPZJrSCA8
- الرقم الوطني الموحد: 7002200579
- Established: 1997
- Payments wanted: mada, Apple Pay · Shipping: SMSA, Aramex
