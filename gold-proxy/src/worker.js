import puppeteer from "@cloudflare/puppeteer";

/**
 * Taj Gold Proxy
 * - Cron (every 1 min): headless Chrome opens dewanaldahab, reads the rendered
 *   gram prices (#caret24/21/18_Price data-price), stores JSON in KV.
 * - fetch: serves the cached JSON with CORS open. Never runs the browser on a
 *   user request, so the storefront stays fast and cheap.
 */

const CACHE_KEY = "gold_prices";
const SELECTORS = {
  "24k": "#caret24_Price",
  "21k": "#caret21_Price",
  "18k": "#caret18_Price",
};

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
      const data = await scrape(env);
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

  // --- Cron: scrape + cache ------------------------------------------------
  async scheduled(event, env, ctx) {
    ctx.waitUntil(scrape(env));
  },
};

async function scrape(env) {
  let browser;
  try {
    browser = await puppeteer.launch(env.BROWSER);
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
    );

    // Blazor Server keeps a persistent SSE/long-poll connection open, so the
    // network never goes idle. Use domcontentloaded and rely on waitForFunction
    // to detect when prices have actually rendered.
    await page.goto(env.SOURCE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Wait until the 24k price element has a real data-price value.
    try {
      await page.waitForFunction(
        (sel) => {
          const el = document.querySelector(sel);
          if (!el) return false;
          const v = el.getAttribute("data-price");
          return v && parseFloat(v) > 0;
        },
        { timeout: 40000, polling: 500 },
        SELECTORS["24k"]
      );
    } catch (waitErr) {
      // Capture diagnostics: does the element exist at all? what does it hold?
      const diag = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        return {
          exists: !!el,
          dataPrice: el ? el.getAttribute("data-price") : null,
          text: el ? (el.textContent || "").trim().slice(0, 60) : null,
          bodyLen: document.body ? document.body.innerHTML.length : 0,
        };
      }, SELECTORS["24k"]).catch(() => null);
      throw new Error("price wait timeout; diag=" + JSON.stringify(diag));
    }

    // NOTE: no inner named functions here. esbuild/wrangler wraps named
    // functions with a __name() helper that does not exist in the page
    // context, causing "__name is not defined". Keep this body flat.
    const prices = await page.evaluate((selectors) => {
      const out = {};
      for (const k in selectors) {
        const el = document.querySelector(selectors[k]);
        let v = null;
        if (el) {
          const attr = el.getAttribute("data-price");
          v = attr ? parseFloat(attr) : parseFloat((el.textContent || "").replace(/[^\d.]/g, ""));
          if (isNaN(v)) v = null;
        }
        out[k] = v;
      }
      return out;
    }, SELECTORS);

    await browser.close();
    browser = null;

    // Validate we got real numbers.
    const valid = ["24k", "21k", "18k"].every((k) => typeof prices[k] === "number" && prices[k] > 0);
    if (!valid) throw new Error("scrape returned empty/invalid prices: " + JSON.stringify(prices));

    const payload = {
      ok: true,
      source: "dewanaldahab.com",
      unit: "SAR_per_gram",
      prices,
      time: new Date().toISOString(),
      stale: false,
    };

    await env.GOLD_KV.put(CACHE_KEY, JSON.stringify(payload));
    return payload;
  } catch (err) {
    if (browser) {
      try { await browser.close(); } catch {}
    }
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

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}
