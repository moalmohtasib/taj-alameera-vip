#!/usr/bin/env python3
# =============================================================================
# TAJ ALAMEERA - Salla Product-Import XLSX Builder (openpyxl)
# -----------------------------------------------------------------------------
# Salla rejected our hand-zipped xlsx ("must be Microsoft Excel"). Its parser
# (PhpSpreadsheet) wants a genuinely valid OOXML file. This loads Salla's OWN
# downloaded template with openpyxl, writes our 28 product rows starting at
# row 3 (keeping Salla's header rows 1 & 2 + validation intact), and saves a
# clean xlsx Salla accepts.
#
# Run with the interpreter that HAS openpyxl:
#     /usr/bin/python3 build-import-xlsx.py
#
# Env:
#   TEMPLATE   Salla template path (default ~/Downloads/product-sample.xlsx)
#   OUT        output path (default ./salla-import.xlsx)
#   VAT_RATE   default 0 (owner adds VAT in Salla dashboard at checkout)
#   FORCE_STALE=1  allow stale proxy price
# =============================================================================
import os
import sys
import json
import urllib.request

try:
    import openpyxl
except ImportError:
    sys.exit("openpyxl missing. Run with /usr/bin/python3 (it has openpyxl 3.1.5).")

HERE = os.path.dirname(os.path.abspath(__file__))

PROXY_URL = "https://taj-gold-proxy.tajalamerahost.workers.dev/"
GRAM_MIN, GRAM_MAX = 150, 900
VAT_RATE = float(os.environ.get("VAT_RATE", "0"))
ALLOW_STALE = os.environ.get("FORCE_STALE") == "1"
TEMPLATE = os.environ.get("TEMPLATE", os.path.expanduser("~/Downloads/product-sample.xlsx"))
OUT = os.environ.get("OUT", os.path.join(HERE, "salla-import.xlsx"))
SEED = os.path.join(HERE, "seed-products.json")

# Salla rejects import when the category / product-type / brand columns carry
# values it wants set in the dashboard ("please delete category type brand").
# Default ON = leave C (تصنيف), F (نوع المنتج), T (الماركة) BLANK; owner assigns
# category + type in Salla after import (bulk-select). Set BLANK_META=0 to keep them.
BLANK_META = os.environ.get("BLANK_META", "1") != "0"

# profit tiers all 0 until owner sends real numbers (keep same as JS scripts)
PROFIT_TIERS = [(5, 0), (10, 0), (20, 0), (float("inf"), 0)]

# our seed category_ar -> Salla store's EXACT category name
CAT_MAP = {"أساور": "أساور", "سلاسل": "سلاسل وعقود", "خواتم": "خواتم"}


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
        "User-Agent": "Mozilla/5.0 (Macintosh; taj-import-builder)",
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


KARAT_LABEL = {"24k": "24", "21k": "21", "18k": "18"}


def main():
    if not os.path.exists(TEMPLATE):
        sys.exit("template missing: %s (put Salla's product-sample.xlsx there or set TEMPLATE=)" % TEMPLATE)
    with open(SEED, "r", encoding="utf-8") as f:
        seed = json.load(f)

    gram = get_gram()
    print("Gram (SAR): 24k=%s 21k=%s 18k=%s time=%s" % (gram["24k"], gram["21k"], gram["18k"], gram["time"]))

    wb = openpyxl.load_workbook(TEMPLATE)
    ws = wb.active

    # Salla's template ships with sample rows 3 & 4 (a product + a variant row)
    # pre-filled across ALL columns (brand, tax flags, option columns, extra
    # category). We only set a few columns, so leftover sample junk stayed and
    # Salla rejected it ("delete extra category / type"). Wipe every data cell
    # first so each row carries ONLY our values.
    last_col = max(ws.max_column, 40)
    for r in range(3, ws.max_row + 5):
        for c in range(1, last_col + 1):
            ws.cell(row=r, column=c).value = None

    row = 3  # rows 1 & 2 are Salla's headers
    ok = failed = 0
    for p in seed:
        try:
            price = compute_price(gram, p)
        except Exception as e:
            print("P%s %s: %s" % (p.get("folder"), p.get("name"), e))
            failed += 1
            continue
        karat = KARAT_LABEL.get(p["karat"], p["karat"])
        cat = CAT_MAP.get(p["category_ar"], p["category_ar"])
        if p.get("placeholder"):
            desc = "%s - عيار %s - وزن تقريبي %s جم. السعر محسوب من سعر الجرام المباشر. (بيانات مبدئية تُحدّث لاحقاً)" % (p["name"], karat, p["weight"])
        else:
            desc = "%s - عيار %s - %s جم." % (p["name"], karat, p["weight"])
        gallery = p.get("gallery") or []
        imgs = ",".join([u for u in (gallery if gallery else [p.get("hero")]) if u])
        kg = round4(p["weight"] / 1000.0)

        ws.cell(row=row, column=1, value="منتج")          # A النوع (product row marker; NOT product-type)
        ws.cell(row=row, column=2, value=p["name"])        # B أسم المنتج
        if not BLANK_META:
            ws.cell(row=row, column=3, value=cat)          # C تصنيف المنتج
        ws.cell(row=row, column=4, value=imgs)             # D صورة المنتج
        ws.cell(row=row, column=5, value=p["name"])        # E وصف صورة المنتج (alt)
        if not BLANK_META:
            ws.cell(row=row, column=6, value="منتج جاهز")  # F نوع المنتج
        ws.cell(row=row, column=7, value=price)            # G سعر المنتج
        ws.cell(row=row, column=8, value=desc)             # H الوصف
        ws.cell(row=row, column=9, value="نعم")            # I هل يتطلب شحن؟
        ws.cell(row=row, column=10, value=p["sku"])        # J رمز المنتج sku
        ws.cell(row=row, column=18, value=kg)              # R الوزن (kg)
        ws.cell(row=row, column=19, value="kg")            # S وحدة الوزن
        print("row %d: P%s %s  %s %sg -> %s SAR  [%s]" % (row, p.get("folder"), p["name"], p["karat"], p["weight"], price, cat))
        row += 1
        ok += 1

    wb.save(OUT)
    print("-" * 64)
    print("Wrote %d product rows -> %s  (VAT %s)" % (ok, OUT, VAT_RATE))
    if failed:
        print("%d failed." % failed)
        sys.exit(2)


if __name__ == "__main__":
    main()
