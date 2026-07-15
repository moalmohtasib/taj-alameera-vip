# Taj Gold Proxy (Cloudflare Worker)

Computes Saudi gold gram prices (24k/21k/18k) every 1 minute from the live spot
XAU/USD price and the SAMA-fixed USD->SAR peg (3.75), caches them in KV, and
serves clean JSON with CORS open so the Salla storefront can `fetch()` them.

**Why this method (Option A):** Saudi Arabia has no central gold authority. Every
dealer prices gold as `(spot_USD/oz ÷ 31.1035) × (karat/24) × 3.75`. Computing it
ourselves = the true market price, independent of any one dealer site, with no
fragile headless-browser scrape.

Endpoint after deploy:

```
https://taj-gold-proxy.<your-subdomain>.workers.dev/
```

Returns:

```json
{
  "ok": true,
  "source": "spot XAU/USD x SAR peg 3.75",
  "unit": "SAR_per_gram",
  "spot_usd_oz": 4030.60,
  "peg": 3.75,
  "prices": { "24k": 485.95, "21k": 425.21, "18k": 364.46 },
  "time": "2026-07-15T10:00:00.000Z",
  "stale": false
}
```

---

## Requirements

- Cloudflare account.
- Free Workers plan is enough — Option A uses a plain `fetch()`, no Browser
  Rendering. (If you keep the existing Paid plan it also works; not required.)
- Node.js installed locally (to run wrangler).

---

## One-time setup

Run these from inside the `gold-proxy/` folder.

### 1. Install deps
```bash
npm install
```

### 2. Log in to Cloudflare
```bash
npx wrangler login
```
Browser opens → approve.

### 3. Create the KV namespace
```bash
npx wrangler kv namespace create GOLD_KV
```
It prints something like:
```
id = "abc123def456..."
```
Copy that id.

### 4. Paste the KV id
Open `wrangler.toml`, replace `PASTE_KV_ID_HERE` with the id from step 3.

### 5. Deploy
```bash
npm run deploy
```
Wrangler prints your live URL, e.g.
`https://taj-gold-proxy.yourname.workers.dev`

---

## Test it

Force an immediate recompute (bypasses waiting for the cron):
```bash
curl "https://taj-gold-proxy.yourname.workers.dev/refresh"
```
Should return live prices. Then the normal endpoint serves cached data:
```bash
curl "https://taj-gold-proxy.yourname.workers.dev/"
```

Watch live logs while testing:
```bash
npm run tail
```

---

## How it stays cheap + reliable

- One tiny `fetch()` to the spot feed on the **cron** (1/min) and on `/refresh`,
  never on visitor requests.
- Visitors hit KV cache only — instant, near-free. Free Workers plan covers it.
- If the spot feed is down, the proxy keeps serving the last good value with
  `"stale": true`, so the storefront bar never goes blank.

---

## Tuning knobs (wrangler.toml [vars])

- `SPOT_URL` — spot XAU/USD feed (USD per troy ounce). Default: gold-api.com (keyless).
  Swap for any JSON endpoint that returns `{ "price": <usd_per_oz> }`.
- `USD_SAR_PEG` — SAMA-fixed peg, `3.75`. Constant; do not change unless SAMA re-pegs.
- `MARKET_PREMIUM` — multiplier over bare spot. `1` = pure bullion price. Bump to
  e.g. `1.02` to mirror a local retail markup if the owner wants the bar to match
  street dealers instead of pure spot.

## If the spot feed changes shape

The worker reads `data.price` (USD per troy ounce) from `SPOT_URL`. If that feed
changes its JSON key or goes away, point `SPOT_URL` at another feed and adjust the
`data.price` read in `fetchSpotUsdPerOz()` in `src/worker.js`.
