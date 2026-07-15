#!/usr/bin/env bash
# Copy a page-content file onto the clipboard as REAL HTML so Salla's Quill
# rich-text editor parses tags into formatting (heading/bold/bullets) instead
# of showing raw <p> text.
#
# Usage:
#   ./paste.sh 1          # copy page 01 (matches leading number 01-*)
#   ./paste.sh contact    # copy by name fragment
#   ./paste.sh            # list all pages + their numbers
set -euo pipefail
cd "$(dirname "$0")"

if [ $# -eq 0 ]; then
  echo "Pages:"
  ls [0-9]*.html | sed 's/^/  /'
  echo
  echo "Run:  ./paste.sh <number|name>   e.g.  ./paste.sh 2"
  exit 0
fi

arg="$1"
# zero-pad a bare number (2 -> 02) so it matches the NN- prefix
if [[ "$arg" =~ ^[0-9]+$ ]]; then
  arg=$(printf "%02d" "$arg")
fi

# find exactly one matching file
matches=( $(ls [0-9]*.html | grep -- "$arg" || true) )
if [ ${#matches[@]} -eq 0 ]; then
  echo "no page matches: $1"; exit 1
elif [ ${#matches[@]} -gt 1 ]; then
  echo "ambiguous '$1' matches:"; printf '  %s\n' "${matches[@]}"; exit 1
fi

file="${matches[0]}"
hex=$(python3 -c "import sys;print(open(sys.argv[1],'rb').read().hex())" "$file")
osascript -e "set the clipboard to «data HTML${hex}»"
echo "COPIED as HTML → $file  ($(( ${#hex} / 2 )) bytes)"
echo "Now in Salla: click Page content editor → Cmd+A → Delete → Cmd+V → save."
