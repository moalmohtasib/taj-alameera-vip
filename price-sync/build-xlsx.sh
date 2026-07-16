#!/usr/bin/env bash
# Fill Salla's import template with our products -> price-sync/salla-import.xlsx
# Usage: TEMPLATE=/path/to/product-sample.xlsx ./build-xlsx.sh
set -euo pipefail
cd "$(dirname "$0")"

TEMPLATE="${TEMPLATE:-$HOME/Downloads/product-sample.xlsx}"
WORKDIR="${WORKDIR:-/tmp/salla-xlsx-build}"
OUT="$(pwd)/salla-import.xlsx"

[ -f "$TEMPLATE" ] || { echo "template not found: $TEMPLATE"; exit 1; }

rm -rf "$WORKDIR"
mkdir -p "$WORKDIR"
unzip -o -q "$TEMPLATE" -d "$WORKDIR"

WORKDIR="$WORKDIR" node build-import-xlsx.js

# rezip: mimetype-agnostic; just zip everything back preserving structure.
rm -f "$OUT"
( cd "$WORKDIR" && zip -r -q -X "$OUT" "[Content_Types].xml" _rels docProps xl )
echo "----------------------------------------------------------------"
echo "Wrote $OUT"
