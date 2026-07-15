# Taj Alameera — Price Sync Engine

Keeps every product's Salla price equal to `((live_gram × weight) + making_charge) × (1 + VAT)`.
Because Salla charges the **stored** price at checkout, we push the computed price
INTO Salla instead of faking it in the browser. Display == checkout. Always.

## Why not just change the price with JS in the storefront?
The browser can repaint the number, but Salla's server still charges the price
stored in the product. Customer would see one price, pay another. Never do that
for a real store. This engine makes Salla itself hold the correct price.

## Files
- `price-sync.js` — the engine (Node 18+, uses native fetch).

## VAT
`VAT_RATE` in CONFIG defaults to `0.15` (KSA 15%). If Salla adds VAT itself at
checkout, set it to `0` to avoid double-charging. Confirm how Salla handles VAT
before the first live run.

## Safety guards (all ON by default)
- **DRY_RUN** — default. Computes + prints, writes NOTHING. Flip with `LIVE=1`.
- **Token required** — LIVE aborts if `SALLA_API_TOKEN` missing.
- **Stale block** — if proxy says `stale:true`, refuses to sync (override `FORCE_STALE=1`).
- **Bounds** — gram price must be 150–900 SAR or it aborts (catches proxy garbage/0).
- **Move guard** — blocks any single price jump >35% vs current Salla price
  (catches a wrong weight/karat typo before it wrecks a live price).

## Setup
1. Get a Salla API token (Merchant dashboard → Apps/API → access token).
2. Fill `PRODUCTS[]` in `price-sync.js` from `products/OWNER-PRODUCT-DATA` sheet.
   Each needs: Salla `id`, `karat`, `weight`, `making {type,value}`, optional `stones`.

## Run
```bash
# 1. DRY RUN first — always. Prints what it WOULD write, touches nothing.
node price-sync/price-sync.js

# 2. When numbers look right, go live:
export SALLA_API_TOKEN="xxxxx"
LIVE=1 node price-sync/price-sync.js
```

## Schedule (1-minute cadence — matches the storefront ticker)
Run it every minute so the stored Salla price tracks the live ticker.

**No-op guard makes this cheap:** each run fetches the current Salla price and
only PUTs when the computed price actually changed. Gold barely moves minute to
minute, so most runs write NOTHING — just GET reads. Writes happen only on a real
price change. This keeps you under Salla's API rate limits.

Options:
- **cron** on any always-on machine / cheap VPS:
  ```
  * * * * *  SALLA_API_TOKEN=xxx LIVE=1 node /path/price-sync/price-sync.js >> /var/log/taj-price.log 2>&1
  ```
  (every minute. Guard skips identical prices, so it's mostly reads.)
- **GitHub Actions** scheduled workflow — min interval is 5 min, and runners are
  not guaranteed on-time. OK-ish, not true 1-min. Prefer VPS/Worker for 1-min.
- **Cloudflare Worker Cron** (same account as the proxy) — supports 1-min, and it
  lives next to the gram-price proxy. Best fit for exact 1-min.

⚠️ **Rate limits:** at 1-min × N products you do N GET reads/min. Confirm this sits
under your Salla plan's API quota before going live. If tight, raise interval to
2–5 min (gold drift is still cents) or batch reads.

## First live run checklist
- [ ] Products imported into Salla, each has an `id`.
- [ ] `PRODUCTS[]` filled + double-checked weight/karat/making.
- [ ] DRY_RUN output reviewed — every computed price looks sane.
- [ ] Token set as env var (never commit it).
- [ ] Run LIVE once manually, watch the log, verify 2–3 products in Salla by hand.
- [ ] Then schedule it.

## Verify price integrity (do this before selling)
Add a product to cart → go to checkout → the charged price MUST equal the shown
price. If they differ, STOP: a sync didn't run or a product was edited manually.
