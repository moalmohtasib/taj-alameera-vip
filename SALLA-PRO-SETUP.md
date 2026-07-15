# Salla Pro — Setup & Launch Playbook (Taj Alameera)

Everything the store owner/admin must do **inside the Salla dashboard** to go live.
Dev-side code (inject script, price-sync, page HTML) is already built — this doc is the
Salla-panel half. Do these in order.

---

## 0. Prerequisites
- Salla **Pro** plan active (custom code injection + custom pages require Pro).
- Store verified (commercial registration / national address / bank).
- Owner data received: footer values + filled product sheet (see `OWNER-NEEDS.html`,
  `OWNER-PRODUCTS-FILL.html`).

---

## 1. Store activation & identity
1. Dashboard → **Settings → Store Data** (بيانات المتجر): store name, logo, description.
2. **Settings → Store Verification** (توثيق المتجر): upload CR (السجل التجاري), national
   address, owner ID. Required before real payments settle.
3. **Settings → VAT** (الضريبة): enter VAT/tax number, set rate **15%**.
   - ⚠️ **Critical for pricing:** decide who adds VAT.
     - If Salla adds 15% at checkout → set `VAT_RATE = 0` in `price-sync/price-sync.js`
       (else double-charge).
     - If prices are VAT-inclusive (Salla adds nothing) → keep `VAT_RATE = 0.15`.
   - Confirm this ONCE, test one product end-to-end before bulk sync.

---

## 2. Categories & catalog structure
1. Dashboard → **Products → Categories** (التصنيفات): create categories matching
   the inject `CATEGORIES` list (خواتم / أساور / قلائد / أقراط …).
2. Keep category **slugs/URLs** consistent — footer shop links point to them.

---
## 3. Import products
Two ways:

**A. Bulk (recommended if many products)**
1. Fill `products/OWNER-PRODUCT-DATA.csv` (owner data).
2. Dashboard → **Products → Import** (استيراد): map CSV columns to Salla fields.
3. Import as **draft** first, review, then publish.
4. Leave **price** as a placeholder — the price-sync engine sets the real price.

**B. Manual (few products)**
1. **Products → Add Product**: name, category, images, karat/عيار (as option or custom
   field), weight, description.
2. Note each product's **Salla product ID** (in URL or via API) — needed for price-sync.

### Link images
- Product photos live in the repo (`products/product-N/`) served via jsDelivr CDN.
- Either upload directly in Salla, or reference the CDN URLs. Keep folder number = product ID
  mapping documented.

---

## 4. Price-sync engine (the money-critical step)
The displayed price and the charged price MUST match. Client-side JS can only repaint the
display; Salla charges the **stored** price. So we PUSH computed prices into Salla via API.

1. Get a **Salla Merchant API token**: Dashboard → **Settings → Developers / API** →
   create token with product read/write scope.
2. Fill `price-sync/price-sync.js` → `PRODUCTS[]`: one entry per product with
   `{ id, name, karat, weight, making:{type,value}, stones }`.
   - `id` = Salla product ID (from step 3).
3. **Dry run first** (writes nothing):
   ```bash
   SALLA_API_TOKEN="xxxxx" node price-sync/price-sync.js
   ```
   Read every printed line. Confirm each computed price looks right.
4. Go live for real:
   ```bash
   LIVE=1 SALLA_API_TOKEN="xxxxx" node price-sync/price-sync.js
   ```
5. Safety guards already built in: dry-run default, gram bounds 150–900 SAR, stale-price
   block, and a 35% move-guard that blocks any price jump bigger than 35% vs the current
   Salla price (catches a weight/karat typo before it nukes a real price).
6. **Schedule it** so prices track live gold. Cron example (every 30 min):
   ```
   */30 * * * * LIVE=1 SALLA_API_TOKEN="xxxxx" node /path/price-sync/price-sync.js >> /var/log/taj-price.log 2>&1
   ```
   Store the token in the environment / secret manager — never commit it.

---

## 5. Custom code injection (inject script)
1. Dashboard → **Settings → Custom Code** (الأكواد المخصصة) — Pro only.
2. Paste the full contents of `salla-inject/salla-inject.js` into the JS field
   (footer target: sitewide / all pages).
3. Save, then hard-refresh the storefront. Verify: gold ticker, header, hero, footer render.
4. Any time you edit the inject file locally → re-paste the whole thing here.

---

## 6. Custom pages (11 pages)
Pages already exist as empty shells in Salla. Content HTML is in `page-content/`.
1. Dashboard → **Pages** (الصفحات) → open each page.
2. Switch editor to **HTML / source view** (`< >`).
3. Paste the matching file (see `page-content/README.md` for the file → page-ID map).
4. Save + verify styling on storefront.
5. ⚠️ **Owner must review before publish:** contact page (real phone/email/address),
   fatwa page (approve/replace text), privacy/returns/terms (legal review + fill the
   `[حدد المدة]` return-window blank).

---

## 7. Payments
1. Dashboard → **Settings → Payments** (المدفوعات).
2. Enable: **mada, Visa, Mastercard, Apple Pay** (already shown in footer badges).
3. Optional BNPL: **Tabby / Tamara** — enable in Salla, then flip `tabby:true`/`tamara:true`
   in the inject `FOOTER.pay` config so badges show.
4. Test with a real card in Salla test/live mode.

---

## 8. Shipping
1. Dashboard → **Settings → Shipping** (الشحن): add courier(s), zones, rates.
2. For high-value gold: consider insured/signed delivery. Confirm packaging + tracking.

---

## 9. Pre-launch test pass
- [ ] One product: dry-run price matches manual math (gold×gram + making + VAT).
- [ ] Same product LIVE-synced; open storefront → displayed price == cart == checkout total.
- [ ] Footer: every filled field shows, empty fields auto-hide, all links work.
- [ ] All 11 pages render styled, no placeholder text left, legal pages reviewed.
- [ ] Payment methods complete a real test order.
- [ ] Shipping cost + address flow works.
- [ ] Ticker shows live gold prices, not stale/zero.
- [ ] Mobile view: header, footer grid, hero all responsive.

---

## 10. Go live
1. Publish all products (from draft).
2. Publish all custom pages.
3. Turn on the price-sync cron.
4. Remove Salla store "under construction" / password protection if set.
5. Do one real end-to-end purchase yourself before announcing.

---

### Quick reference — the docs
| Doc | For | Purpose |
|---|---|---|
| `OWNER-NEEDS.html` | Owner | Footer values + price formula |
| `OWNER-PRODUCTS-FILL.html` | Owner | Fill product grams/karat/making |
| `products/OWNER-PRODUCT-DATA.csv` | Owner | Bulk import sheet |
| `ROADMAP-TO-LAUNCH.md` | Dev | Full phase A–H plan |
| `SALLA-PRO-SETUP.md` | Dev | This file — Salla panel steps |
| `price-sync/README.md` | Dev | Price engine deep-dive |
| `page-content/README.md` | Dev | Page HTML → Salla page-ID map |

