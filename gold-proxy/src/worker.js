/**
 * Taj Gold Proxy — Option A (pure spot math, no headless browser)
 *
 * Saudi has no central gold authority. Every dealer prices gold as:
 *     gram_SAR = (spot_USD_per_oz / 31.1034768) * (karat/24) * USD_SAR_peg
 * The USD->SAR peg is fixed at 3.75 by SAMA and never floats.
 *
 * - Cron (every 1 min): fetch spot XAU/USD, compute 24/21/18k SAR gram prices,
 *   store JSON in KV.
 * - fetch: serve cached JSON with CORS open. Never calls the upstream API on a
 *   visitor request, so the storefront stays fast and within rate limits.
 *
 * Output payload is byte-compatible with the previous scrape version, so the
 * storefront inject needs no change.
 */

const CACHE_KEY = "gold_prices";
const OZ_TO_GRAM = 31.1034768; // troy ounce -> gram
const KARATS = { "24k": 24, "21k": 21, "18k": 18 };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  // --- Serve cached prices -------------------------------------------------
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);

    // Manual refresh endpoint for testing: /refresh
    if (url.pathname === "/refresh") {
      const data = await computeAndCache(env);
      return json(data, data.ok ? 200 : 502);
    }

    const cached = await env.GOLD_KV.get(CACHE_KEY);
    if (!cached) {
      return json({ ok: false, error: "no data yet, wait for first cron" }, 503);
    }
    return new Response(cached, {
      headers: { "Content-Type": "application/json", ...CORS },
    });
  },

  // --- Cron: compute + cache ----------------------------------------------
  async scheduled(event, env, ctx) {
    ctx.waitUntil(computeAndCache(env));
  },
};

async function computeAndCache(env) {
  try {
    const spot = await fetchSpotUsdPerOz(env);
    if (!(typeof spot === "number" && spot > 0)) {
      throw new Error("bad spot value: " + JSON.stringify(spot));
    }

    const peg = parseFloat(env.USD_SAR_PEG || "3.75");
    const premium = parseFloat(env.MARKET_PREMIUM || "1"); // multiplier, 1 = pure spot

    const prices = {};
    for (const key in KARATS) {
      const purity = KARATS[key] / 24;
      const gram = (spot / OZ_TO_GRAM) * purity * peg * premium;
      prices[key] = Math.round(gram * 100) / 100; // 2 decimals
    }

    const valid = ["24k", "21k", "18k"].every(
      (k) => typeof prices[k] === "number" && prices[k] > 0
    );
    if (!valid) throw new Error("computed invalid prices: " + JSON.stringify(prices));

    const payload = {
      ok: true,
      source: "spot XAU/USD x SAR peg 3.75",
      unit: "SAR_per_gram",
      spot_usd_oz: Math.round(spot * 100) / 100,
      peg: peg,
      prices,
      time: new Date().toISOString(),
      stale: false,
    };

    await env.GOLD_KV.put(CACHE_KEY, JSON.stringify(payload));
    return payload;
  } catch (err) {
    // On failure, mark last-good as stale so the bar still shows something.
    const cached = await env.GOLD_KV.get(CACHE_KEY);
    if (cached) {
      const obj = JSON.parse(cached);
      obj.stale = true;
      obj.lastError = String(err.message || err);
      await env.GOLD_KV.put(CACHE_KEY, JSON.stringify(obj));
      return obj;
    }
    return { ok: false, error: String(err.message || err) };
  }
}

// Fetch spot gold price in USD per troy ounce.
// Primary: gold-api.com (keyless). Returns { price: <usd_per_oz>, ... }.
async function fetchSpotUsdPerOz(env) {
  const url = env.SPOT_URL || "https://api.gold-api.com/price/XAU";
  const res = await fetch(url, {
    headers: { "User-Agent": "taj-gold-proxy", Accept: "application/json" },
    cf: { cacheTtl: 0 },
  });
  if (!res.ok) throw new Error("spot fetch HTTP " + res.status);
  const data = await res.json();
  const price = parseFloat(data.price);
  if (isNaN(price)) throw new Error("spot payload missing price: " + JSON.stringify(data));
  return price;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}
