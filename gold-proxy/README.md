# Taj Gold Proxy (Cloudflare Worker)

Scrapes gold gram prices (24k/21k/18k) from **dewanaldahab.com/ar** every 1 minute
using headless Chrome, caches them in KV, and serves clean JSON with CORS open so
the Salla storefront can `fetch()` them.

Endpoint after deploy:

```
https://taj-gold-proxy.<your-subdomain>.workers.dev/
```

Returns:

```json
{
  "ok": true,
  "source": "dewanaldahab.com",
  "unit": "SAR_per_gram",
  "prices": { "24k": 482.10, "21k": 421.80, "18k": 361.55 },
  "time": "2026-07-12T10:00:00.000Z",
  "stale": false
}
```

---

## Requirements

- Cloudflare account.
- **Workers Paid plan** ($5/mo minimum) — Browser Rendering needs it. This is the only
  cost. No VPS, no domain required.
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

### 5. Enable Browser Rendering
- Cloudflare dashboard → your account → **Workers & Pages** → **Plans** → upgrade to
  **Workers Paid** if not already.
- Browser Rendering is included; the `browser` binding in `wrangler.toml` wires it up.

### 6. Deploy
```bash
npm run deploy
```
Wrangler prints your live URL, e.g.
`https://taj-gold-proxy.yourname.workers.dev`

---

## Test it

Force an immediate scrape (bypasses waiting for the cron):
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

- Browser only runs on the **cron** (1/min) and on `/refresh`, never on visitor requests.
- Visitors hit KV cache only — instant, near-free.
- If dewanaldahab is down or changes markup, the proxy keeps serving the last good value
  with `"stale": true`, so the storefront bar never goes blank.

---

## If they change their site

The scrape targets these element IDs on dewanaldahab:
`#caret24_Price`, `#caret21_Price`, `#caret18_Price` (reads their `data-price` attribute).

If prices stop updating, open dewanaldahab.com/ar in a browser, inspect the price
elements, and update `SELECTORS` in `src/worker.js`.
