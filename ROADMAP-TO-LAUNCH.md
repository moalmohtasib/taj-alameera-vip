# Taj Alameera — Road to Launch (Sell-Ready)

Single checklist to take the store from "design done" to "accepting real orders" on Salla Pro.
Ordered by dependency. Do top to bottom. Check boxes as you finish.

Legend: **[OWNER]** = store owner action · **[DEV]** = my code/build · **[BOTH]** = coordinate.

---

## PHASE A — Collect Product Data  (unblocks everything)

- [ ] **[OWNER]** Open `products/OWNER-PRODUCT-DATA.csv` in Google Sheets.
- [ ] **[OWNER]** Read `products/دليل-تعبئة-بيانات-المنتجات.md` (Arabic guide).
- [ ] **[OWNER]** Fill ONE row per product. Required per row:
      - رقم المنتج (matches image folder number)
      - اسم عربي · التصنيف · العيار (24/21/18) · اللون
      - **الوزن بالجرام** (drives price)
      - **أجرة الصنعة** (per-gram OR fixed) + قيمتها
      - الأحجار (if any) · الكمية · الوصف
- [ ] **[OWNER]** Do NOT write final price — it auto-calculates live.
- [ ] **[BOTH]** Owner signals done → hand sheet back to me.

**Done when:** every product (1–28+) has a filled row with weight + karat + making charge.

---

## PHASE B — Hero Images Final  (parallel with A)

- [ ] **[OWNER]** For each product folder, pick the **hero** AI image (best one).
      Tell me the filename, or edit the `Hero pick:` line in each `PRODUCT-N.md`.
- [ ] **[DEV]** Confirm each hero is web-optimized (compress >1MB jpegs to webp ~150KB).
- [ ] **[DEV]** Upload heroes to Salla per product (or via bulk import URL column).

**Done when:** every product has one chosen, optimized hero image ready to upload.

---

## PHASE C — Import Products into Salla

- [ ] **[DEV]** Convert filled sheet → Salla bulk-import format (Salla accepts Excel/CSV import).
- [ ] **[DEV/OWNER]** Dashboard → المنتجات → استيراد (Import). Upload the file.
- [ ] **[BOTH]** Verify: name, category, weight, quantity, SKU landed on each product.
- [ ] **[DEV]** Store the weight + karat + making-charge on each product where the live
      calculator can read it (Salla custom field / product weight field / SKU encoding).

**Done when:** all products exist in Salla with correct data, categorized, in stock.

---

## PHASE D — Live Price Calculator  (the gold-store engine)  **[DEV]**

Salla stores a FIXED price. Gold moves daily. So:

- [ ] **[DEV]** Build JS in `salla-inject.js`: on every product card + product page, read
      `weight × live-gram-price(karat) + making-charge` and overwrite the shown price.
      Gram price = same proxy the ticker uses (`taj-gold-proxy...workers.dev`).
- [ ] **[DEV]** Encode weight + karat + making-charge so JS can read them per product
      (from SKU pattern `R-21Y-0520` OR Salla custom fields OR data attributes).
- [ ] **[DEV]** **Checkout match:** displayed price MUST equal charged price. Two options:
      - (a) Daily auto-sync: scheduled job pushes computed prices into Salla via API each morning.
      - (b) On-add-to-cart hook: set the live price at the moment of adding.
      → Decide + implement one. Without this, cart charges the stale Salla price.
- [ ] **[DEV]** Fallback: if proxy down, show last-good price + no blank/zero prices ever.

**Done when:** card + product page show live price, AND checkout charges the same number.

⚠️ **Do not go live selling until D is verified.** Wrong price = real money loss.

---

## PHASE E — Footer  **[DEV]**

- [ ] **[DEV]** Build branded footer via `salla-inject.js`:
      - Logo + one-line brand tagline (Arabic)
      - Quick links: التصنيفات (rings/bracelets/chains/kids/bars)
      - Policy links: الخصوصية · الاستبدال · الشروط · الشحن
      - Contact: phone / WhatsApp / email / address
      - Social icons: Instagram / Snapchat / TikTok / X (owner to give handles)
      - Payment badges: mada / Visa / Mastercard / Apple Pay / Tabby-Tamara if used
      - Copyright line + CR number (السجل التجاري) + VAT number if required
- [ ] **[OWNER]** Provide: phone, WhatsApp, email, address, social handles, CR + VAT numbers.
- [ ] **[DEV]** Verify footer on home + inner + product + mobile.

**Done when:** footer looks branded, all links work, legal numbers present.

---

## PHASE F — Custom Pages Content  **[BOTH]**

11 pages exist but are EMPTY shells. Need body content:

- [ ] **[OWNER]** Provide text (or approve my drafts) for:
      - من نحن (About) · لماذا تاج الأميرة (Why us)
      - سياسة الخصوصية · الاستبدال والاسترجاع · الشروط
      - دليل مقاسات الخواتم (size table) · العناية بالمجوهرات
      - الأسئلة الشائعة (FAQ) · حكم شراء الذهب أون لاين (Fatwa)
      - تتبع طلبك · تواصل معنا
- [ ] **[DEV]** Paste content into each Salla custom page (CSS already brands them).
- [ ] **[DEV]** Size-guide → styled table. FAQ → accordions. Contact → form/WhatsApp.

**Done when:** every page has real content, styled, mobile-ok.

---

## PHASE G — Store Settings & Legal  **[OWNER]**  (required to sell for real)

- [ ] **[OWNER]** Salla Pro plan active + store verified (توثيق).
- [ ] **[OWNER]** Payment methods enabled (mada, cards, Apple Pay, maybe Tabby/Tamara).
- [ ] **[OWNER]** Shipping companies + rates set (Salla shipping settings).
- [ ] **[OWNER]** Tax/VAT settings (15% if registered) — gold has special KSA rules, confirm.
- [ ] **[OWNER]** Return/refund + privacy policies published (link from footer + pages).
- [ ] **[OWNER]** Store info: name, logo, CR number, contact, address filled in Salla.

**Done when:** payments take real money, shipping calculates, legal pages live.

---

## PHASE H — Full Test Pass  **[BOTH]**

- [ ] Gold ticker shows on home + product + cart + custom pages, updates 60s.
- [ ] Product price = live gram × weight + making charge, on card AND product page.
- [ ] **Add to cart → checkout charges the SAME price shown.** (critical)
- [ ] Category popup opens/closes on home.
- [ ] Footer correct all pages + mobile.
- [ ] All 11 custom pages content + styled, mobile + desktop.
- [ ] Place a REAL test order end-to-end (small item / test card) → order lands in dashboard.
- [ ] Proxy survives + serves stale value if source down (no blank prices).
- [ ] Re-paste latest `salla-inject.js` into Salla panel (deploy step).

**Done when:** every box checked. Store is sell-ready. 🚀

---

## OWNER: WHAT I NEED FROM YOU (quick list)

1. Filled `OWNER-PRODUCT-DATA` sheet (Phase A).
2. Hero image pick per product (Phase B).
3. Contact + social + CR/VAT numbers (Phase E footer).
4. Page texts or approve my drafts (Phase F).
5. Salla Pro active + verified + payments/shipping set (Phase G).

## DEV: WHAT I OWN

- Sheet → Salla import file (C)
- Live price calculator + checkout price match (D)  ← biggest build
- Custom footer (E)
- Page content paste + styling (F)
- Test harness + deploy (H)
