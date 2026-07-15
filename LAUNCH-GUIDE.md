# Taj Alameera — Salla Launch Guide

**Goal:** Ship the store on Salla Pro with the custom look, gold-price bar (live from
dewanaldahab.com), category popup, and custom pages — **without** fighting Salla's
theme-publish review.

This file is your single source of truth. Read top to bottom. Check off boxes as you go.

---

## 0. The Big Picture

We do NOT publish the custom Twig theme to Salla's marketplace (that's the review hell you hit).
Instead:

1. Use a **stock Salla theme** on your store (any clean one).
2. Inject ALL your design + gold bar + popup through Salla's **custom code** field
   (site-wide `<script>` + `<style>`).
3. Build the "10%" custom pages using Salla's **Custom Pages** feature, styled by the same
   injected CSS.
4. Gold prices: a small **proxy server** scrapes dewanaldahab.com every 1 min and serves clean
   JSON. Your injected JS reads that JSON and paints the bar.

Result: ~90% of the theme look reproduced with zero marketplace approval.

---

## 1. Reality Check — What Salla Actually Allows

| Thing | Possible on stock theme + Pro? | How |
|-------|-------------------------------|-----|
| Restyle whole site (colors, fonts, layout) | Yes | Injected CSS overrides |
| Gold price bar on top | Yes | Injected JS builds the bar |
| Category popup on home | Yes | Injected JS builds modal |
| Custom sliders / banners / sections | Mostly | Injected JS inserts DOM |
| Hook cart / wishlist / search events | Yes | `salla.event.on(...)` |
| Brand-new custom pages (about, faq, care...) | Yes | Salla Custom Pages + CSS |
| New URL routes / server templates | No | Needs published Twig theme |
| Deep product-page template rewrite | Partial | JS can only reshape existing DOM |

**Bottom line:** everything the owner asked for (look, info, gold bar, popup) is in the "Yes" rows.

---

## 2. Architecture

```
dewanaldahab.com (Blazor Server)
        │  headless browser reads #caret24/21/18_Price every 1 min
        ▼
  PROXY SERVER  (Playwright + tiny API)  ── caches prices, adds CORS
        │  GET /prices  ->  { "24k": ..., "21k": ..., "18k": ..., "time": ... }
        ▼
  SALLA STORE  (stock theme)
        │  injected JS fetch()s /prices every 1 min
        ▼
  GOLD BAR renders at top of every page
```

---

## 3. PROGRESS CHECKLIST (update as we go)

- [ ] Phase 1 — Salla Pro bought + stock theme live
- [x] Phase 2 — Gold price proxy built + deployed + returning JSON
      → LIVE: https://taj-gold-proxy.tajalamerahost.workers.dev/  (GET / = cached, /refresh = force)
- [ ] Phase 3 — Design injected (styles + gold bar + popup)
- [ ] Phase 4 — Custom pages created
- [ ] Phase 5 — Full test pass, 100% working

---

## PHASE 1 — Buy Salla Pro + set stock theme

**1.1 Buy the plan**
- Go to https://salla.com , log in to your merchant dashboard (لوحة التاجر).
- Settings / Subscription → pick **Professional (احترافي)** — ~299 SAR/month or ~2,990 SAR/year.
- Complete payment. Store must also be verified (توثيق) to sell for real.

**1.2 Pick a clean stock theme**
- Dashboard → Themes (التصاميم / المتجر).
- Activate a simple neutral stock theme (e.g. Salla's default). We restyle it entirely with CSS,
  so its base look barely matters — pick the one with the least fixed clutter.

**1.3 Find the custom-code field**
- Look under one of: Settings → SEO/Tracking codes, OR Store Settings → Custom code,
  OR the theme's "Advanced / أكواد مخصصة" section.
- You need a place that injects raw `<script>` and `<style>` on **every** page (head or body).
- ⚠️ If your Pro plan only exposes "tracking pixels" and NOT free HTML/JS, tell me — we switch
  to plan B (a tiny Salla App that injects the code, still no marketplace theme review).

**Done when:** Pro active + stock theme live + you can paste a test
`<script>alert('hi')</script>` and see it run on the storefront.

---

## PHASE 2 — Gold price proxy (the WebSocket/Blazor scrape)

**Why a proxy:** dewanaldahab is a Blazor Server app. Prices arrive over an encrypted .NET
circuit and only land in the page DOM (`#caret24_Price` etc). Browser-side `fetch` can't read
them (CORS + no clean API). So a server with a headless browser reads the rendered numbers and
re-serves them as clean JSON with CORS open.

**2.1 What the proxy does**
1. Headless Chrome opens `https://dewanaldahab.com/ar`.
2. Waits until `#caret24_Price`, `#caret21_Price`, `#caret18_Price` fill with numbers.
3. Reads their `data-price` (gram price in SAR).
4. Caches result, refreshes every 60s.
5. Serves `GET /prices` → JSON, with `Access-Control-Allow-Origin: *`.

**2.2 Hosting options (pick one)**
| Host | Cost | Notes |
|------|------|-------|
| Small VPS (Hetzner/DigitalOcean) | ~$5/mo | Full control, run Playwright + Node forever. Recommended. |
| Cloudflare Browser Rendering | Paid Workers ($5/mo min) | Serverless, scales, a bit more setup. |
| Browserless.io | Free tier / paid | Managed headless Chrome. |

Recommended: **cheap VPS** — simplest, predictable, owner-owned.

**2.3 Build steps** (I write the code; you deploy)
- [ ] I create `gold-proxy/` (Node + Playwright + Express).
- [ ] You spin a VPS, install Node, `npm i`, `npx playwright install chromium`.
- [ ] Run with `pm2` so it stays alive + auto-restarts.
- [ ] Point a subdomain at it (e.g. `gold.tajalameera.com`) with HTTPS (Caddy = 1 line TLS).
- [ ] Verify `curl https://gold.tajalameera.com/prices` returns live numbers.

**2.4 Fallback safety**
- If the scrape fails (their site down / markup change), proxy serves last-good cached value +
  a `stale: true` flag. The bar never shows blank.

**Done when:** `GET /prices` returns fresh 24/21/18k SAR gram prices matching dewanaldahab's page.

---

## PHASE 3 — Inject the design (look + gold bar + popup)

We compile ONE `.js` + ONE `.css` and paste both into Salla's custom-code field.

**3.1 Styles**
- Port the visual language from your existing `public/app.css` (brand gold, fonts, spacing) into
  a slim override sheet targeting Salla's stock classes.

**3.2 Gold bar**
- Reuse the ticker UI you already built (`src/assets/js/taj-gold-ticker.js`) BUT swap its data
  source: instead of goldapi.io, `fetch('https://gold.tajalameera.com/prices')` every 60s.
- Prepend the bar to `<body>` on every page (already how your code works).

**3.3 Category popup**
- Injected JS builds the modal DOM, wires open/close, pulls categories from
  `salla` storefront data or a static list.

**3.4 Delivery**
- [ ] I build `salla-inject.js` + `salla-inject.css`.
- [ ] You paste into the custom-code field (JS in footer, CSS in head).
- Optionally host the JS on the same VPS and inject only a 1-line `<script src>` for easy updates.

**Done when:** storefront shows your look + live gold bar + working popup.

---

## PHASE 4 — Custom pages (the "10%")

- Dashboard → Pages (الصفحات) → create each: About, FAQ, Care, Policy, Terms, Why-us, Size-guide,
  Contact, Track, Fatwa, Privacy.
- Paste the content HTML into each page's rich editor.
- The injected CSS from Phase 3 styles them to match the Twig originals.
- For anything the editor strips, wrap content in a `<div class="taj-page">` and style via CSS.

**Done when:** every custom page exists, reachable, and styled.

---

## PHASE 5 — Full test pass

- [ ] Gold bar shows on home + product + cart + custom pages.
- [ ] Numbers match dewanaldahab within seconds.
- [ ] Bar updates every 1 min (watch network tab hitting `/prices`).
- [ ] Popup opens/closes on home.
- [ ] Custom pages styled correctly on mobile + desktop.
- [ ] Checkout / cart / wishlist untouched and working.
- [ ] Proxy survives reboot (pm2) + serves stale value if source down.

**Done when:** all boxes checked. Store is live at 100%.

---

## OPEN QUESTIONS FOR YOU

1. Custom-code field: does your Pro plan expose raw HTML/JS, or only tracking pixels?
   (Check Phase 1.3 — decides main path vs Salla-App path.)
2. Proxy host: cheap VPS OK, or you prefer Cloudflare?
3. Do you own a subdomain we can point at the proxy (e.g. `gold.tajalameera.com`)?

---

## NOTES / DECISIONS LOG

- Proxy host = **Cloudflare Worker + Browser Rendering** (needs Workers Paid, $5/mo min).
- No subdomain owned → use free `taj-gold-proxy.<name>.workers.dev` URL. Fine.
- Custom-code field = unknown until Pro bought; check Phase 1.3 right after purchase.
- Plan = buy **annual Pro** (2,990 SAR) for the built-in ~2-month saving. No valid public
  promo codes exist (coupon sites are dead ends).
- Proxy code built → `gold-proxy/` (see `gold-proxy/README.md` for deploy steps).
- Scrape targets dewanaldahab IDs: `#caret24_Price`, `#caret21_Price`, `#caret18_Price`
  (`data-price` attr = SAR/gram). Confirmed from their `site.js`.

