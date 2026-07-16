#!/usr/bin/env python3
# =============================================================================
# TAJ ALAMEERA - Manual add-product PASTE SHEET generator
# -----------------------------------------------------------------------------
# The Salla spreadsheet import kept rejecting and the API token needs an app
# install handshake. This produces a plain-text sheet, one block per product,
# with every field ready to copy-paste into Salla's أضف منتج form:
#   name / category / price (live gold) / description / weight / images.
# No token, no import validator, no review. Owner pastes 28 products by hand.
#
# Run:  /usr/bin/python3 build-paste-sheet.py
# Env:  VAT_RATE (default 0), FORCE_STALE=1 to allow stale proxy price.
# =============================================================================
import os
import sys
import json
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
PROXY_URL = "https://taj-gold-proxy.tajalamerahost.workers.dev/"
GRAM_MIN, GRAM_MAX = 150, 900
VAT_RATE = float(os.environ.get("VAT_RATE", "0"))
ALLOW_STALE = os.environ.get("FORCE_STALE") == "1"
SEED = os.path.join(HERE, "seed-products.json")
OUT = os.path.join(HERE, "paste-sheet.txt")

PROFIT_TIERS = [(5, 0), (10, 0), (20, 0), (float("inf"), 0)]
CAT_MAP = {"أساور": "أساور", "سلاسل": "سلاسل وعقود", "خواتم": "خواتم"}
KARAT_LABEL = {"24k": "24", "21k": "21", "18k": "18"}


def round2(n):
    return round(n * 100) / 100


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
        "User-Agent": "Mozilla/5.0 (Macintosh; taj-paste-sheet)",
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


def main():
    with open(SEED, "r", encoding="utf-8") as f:
        seed = json.load(f)
    gram = get_gram()

    lines = []
    lines.append("=" * 70)
    lines.append("تاج الأميرة - ورقة لصق المنتجات (إضافة يدوية في سلة)")
    lines.append("سعر الجرام SAR: 24=%s  21=%s  18=%s   وقت=%s" % (
        gram["24k"], gram["21k"], gram["18k"], gram["time"]))
    lines.append("VAT: %s  (سلة تضيف الضريبة عند الدفع)" % VAT_RATE)
    lines.append("لكل منتج: انسخ الحقول في نموذج (المنتجات -> أضف منتج).")
    lines.append("=" * 70)

    ok = failed = 0
    for p in seed:
        try:
            price = compute_price(gram, p)
        except Exception as e:
            lines.append("P%s %s: FAILED %s" % (p.get("folder"), p.get("name"), e))
            failed += 1
            continue
        karat = KARAT_LABEL.get(p["karat"], p["karat"])
        cat = CAT_MAP.get(p["category_ar"], p["category_ar"])
        if p.get("placeholder"):
            desc = ("%s - عيار %s - وزن تقريبي %s جم. "
                    "السعر محسوب من سعر الجرام المباشر. (بيانات مبدئية تُحدّث لاحقاً)"
                    % (p["name"], karat, p["weight"]))
        else:
            desc = "%s - عيار %s - %s جم." % (p["name"], karat, p["weight"])
        gallery = p.get("gallery") or []
        imgs = gallery if gallery else [u for u in [p.get("hero")] if u]

        lines.append("")
        lines.append("-" * 70)
        lines.append("[ P%s ]" % p.get("folder"))
        lines.append("الاسم:      %s" % p["name"])
        lines.append("التصنيف:    %s" % cat)
        lines.append("السعر:      %s" % price)
        lines.append("SKU:        %s" % p["sku"])
        lines.append("الوزن:      %s جم" % p["weight"])
        lines.append("الكمية:     %s" % (p.get("quantity") if p.get("quantity") is not None else 1))
        lines.append("الوصف:")
        lines.append("%s" % desc)
        lines.append("الصور (%d) - الصف بالترتيب، الأولى غلاف:" % len(imgs))
        for i, u in enumerate(imgs):
            lines.append("  %d. %s" % (i + 1, u))
        ok += 1

    lines.append("")
    lines.append("=" * 70)
    lines.append("تم: %d منتج جاهز للصق." % ok)
    if failed:
        lines.append("فشل: %d" % failed)

    with open(OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print("Wrote %d products -> %s  (VAT %s)" % (ok, OUT, VAT_RATE))
    if failed:
        print("%d failed." % failed)
        sys.exit(2)


if __name__ == "__main__":
    main()
