#!/usr/bin/env python3
# =============================================================================
# TAJ ALAMEERA - WooCommerce product-export CSV builder
# -----------------------------------------------------------------------------
# Salla's spreadsheet template validator rejected every xlsx/csv we fed it. But
# Salla ALSO has a totally separate importer: المنتجات -> استيراد من منصات ->
# WooCommerce, which eats a WooCommerce "product export" CSV. That pipeline does
# NOT go through the template validator. This produces exactly that CSV, matching
# WooCommerce's own Tools > Export > Products column schema, with live-gold prices.
#
# Two ways to use the output (woo-products.csv):
#   A) Salla dashboard -> import from platforms -> WooCommerce -> upload this CSV.
#   B) Import this CSV into your WordPress/WooCommerce store first
#      (Products -> Import), then Tools > Export > Products, feed that to Salla.
#
# Run:  /usr/bin/python3 build-woo-csv.py
# Env:  VAT_RATE (default 0), FORCE_STALE=1 to allow stale proxy price.
# =============================================================================
import os
import sys
import csv
import json
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
PROXY_URL = "https://taj-gold-proxy.tajalamerahost.workers.dev/"
GRAM_MIN, GRAM_MAX = 150, 900
VAT_RATE = float(os.environ.get("VAT_RATE", "0"))
ALLOW_STALE = os.environ.get("FORCE_STALE") == "1"
SEED = os.path.join(HERE, "seed-products.json")
OUT = os.path.join(HERE, "woo-products.csv")

PROFIT_TIERS = [(5, 0), (10, 0), (20, 0), (float("inf"), 0)]
CAT_MAP = {"أساور": "أساور", "سلاسل": "سلاسل وعقود", "خواتم": "خواتم"}
KARAT_LABEL = {"24k": "24", "21k": "21", "18k": "18"}


def round2(n):
    return round(n * 100) / 100


def round4(n):
    return round(n * 10000) / 10000


def profit_per_gram(w):
    for max_g, per in PROFIT_TIERS:
        if w <= max_g:
            return per
    return 0


def compute_price(gram, p):
    g = gram.get(p["karat"])
    if not isinstance(g, (int, float)):
        raise ValueError("no gram price karat %s" % p["karat"])
    gold = g * p["weight"]
    mk = p["making"]
    if mk["type"] == "per_gram":
        making = mk["value"] * p["weight"]
    elif mk["type"] == "fixed":
        making = mk["value"]
    else:
        raise ValueError("bad making type %s" % mk["type"])
    profit = profit_per_gram(p["weight"]) * p["weight"]
    return round2((gold + making + (p.get("stones") or 0) + profit) * (1 + VAT_RATE))


def get_gram():
    req = urllib.request.Request(PROXY_URL, headers={
        "Cache-Control": "no-store",
        "User-Agent": "Mozilla/5.0 (Macintosh; taj-woo-csv)",
        "Accept": "application/json",
    })
    with urllib.request.urlopen(req, timeout=20) as r:
        d = json.loads(r.read().decode("utf-8"))
    if not d or not d.get("ok") or not d.get("prices"):
        raise ValueError("proxy not-ok / no prices")
    if d.get("stale") and not ALLOW_STALE:
        raise ValueError("proxy STALE. FORCE_STALE=1 to override.")
    prices = d["prices"]
    for k in ("24k", "21k", "18k"):
        v = float(prices[k])
        if v < GRAM_MIN or v > GRAM_MAX:
            raise ValueError("gram %s=%s outside bounds. ABORT." % (k, prices[k]))
    return {"24k": float(prices["24k"]), "21k": float(prices["21k"]),
            "18k": float(prices["18k"]), "time": d.get("time")}


# WooCommerce's own product-export column order (Tools > Export > Products).
HEADERS = [
    "ID", "Type", "SKU", "Name", "Published", "Is featured?",
    "Visibility in catalog", "Short description", "Description",
    "Tax status", "Tax class", "In stock?", "Stock", "Backorders allowed?",
    "Sold individually?", "Weight (kg)", "Length (cm)", "Width (cm)",
    "Height (cm)", "Allow customer reviews?", "Purchase note", "Sale price",
    "Regular price", "Categories", "Tags", "Shipping class", "Images",
    "Position",
]


def main():
    with open(SEED, "r", encoding="utf-8") as f:
        seed = json.load(f)
    gram = get_gram()
    print("Gram (SAR): 24k=%s 21k=%s 18k=%s time=%s" % (
        gram["24k"], gram["21k"], gram["18k"], gram["time"]))

    rows = []
    ok = failed = 0
    for i, p in enumerate(seed, start=1):
        try:
            price = compute_price(gram, p)
        except Exception as e:
            print("P%s %s: FAILED %s" % (p.get("folder"), p.get("name"), e))
            failed += 1
            continue
        karat = KARAT_LABEL.get(p["karat"], p["karat"])
        cat = CAT_MAP.get(p["category_ar"], p["category_ar"])
        if p.get("placeholder"):
            desc = ("%s - عيار %s - وزن تقريبي %s جم. السعر محسوب من سعر الجرام "
                    "المباشر. (بيانات مبدئية تُحدّث لاحقاً)" % (p["name"], karat, p["weight"]))
        else:
            desc = "%s - عيار %s - %s جم." % (p["name"], karat, p["weight"])
        short = "%s - عيار %s" % (p["name"], karat)
        gallery = p.get("gallery") or []
        imgs = ", ".join([u for u in (gallery if gallery else [p.get("hero")]) if u])
        kg = round4(p["weight"] / 1000.0)

        rows.append({
            "ID": "",
            "Type": "simple",
            "SKU": p["sku"],
            "Name": p["name"],
            "Published": 1,
            "Is featured?": 0,
            "Visibility in catalog": "visible",
            "Short description": short,
            "Description": desc,
            "Tax status": "taxable",
            "Tax class": "",
            "In stock?": 1,
            "Stock": p.get("quantity") if p.get("quantity") is not None else 1,
            "Backorders allowed?": 0,
            "Sold individually?": 0,
            "Weight (kg)": kg,
            "Length (cm)": "",
            "Width (cm)": "",
            "Height (cm)": "",
            "Allow customer reviews?": 1,
            "Purchase note": "",
            "Sale price": "",
            "Regular price": price,
            "Categories": cat,
            "Tags": "",
            "Shipping class": "",
            "Images": imgs,
            "Position": i,
        })
        print("P%s %s  %s %sg -> %s SAR  [%s]" % (
            p.get("folder"), p["name"], p["karat"], p["weight"], price, cat))
        ok += 1

    with open(OUT, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=HEADERS)
        w.writeheader()
        w.writerows(rows)

    print("-" * 64)
    print("Wrote %d products -> %s  (VAT %s)" % (ok, OUT, VAT_RATE))
    if failed:
        print("%d failed." % failed)
        sys.exit(2)


if __name__ == "__main__":
    main()
