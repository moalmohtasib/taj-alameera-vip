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

1. Build the import file (prices computed from live gold):
   ```
   cd price-sync
   node build-import-csv.js
   ```
   Writes `price-sync/salla-import.csv` (28 products, status = مخفي/hidden).
   Re-run right before uploading if gold moved. `STATUS=sale node build-import-csv.js`
   to publish immediately instead of hidden.
2. In Salla: المنتجات → استيراد وتصدير → استيراد منتجات جديدة.
3. Download Salla's own template first (it has the exact columns your store
   expects). Open `salla-import.csv`, copy each column into the matching column
   of Salla's template. Rules: don't delete Salla's columns, don't edit gray
   cells, keep multiple image URLs comma-joined in one cell.
4. Save Salla's template, upload it, click تحديث/Update. Wait for processing.
5. Review products, then flip مخفي → معروض to publish.

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
3. **VAT handling** — confirm how Salla applies VAT. If Salla adds 15% itself at
   checkout, set `VAT_RATE: 0` in both scripts to avoid double-charging.
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
