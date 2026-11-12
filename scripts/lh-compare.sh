#!/usr/bin/env bash
# Lighthouse (mobile emulation) before vs after: 3 runs per page, read medians with
#   python3 scripts/lh-summary.py "/tmp/lh/cmp/*.json"
# Usage: scripts/lh-compare.sh <before-port> <after-port>
set -u
BEFORE=${1:-3200}; AFTER=${2:-3100}
OUT=/tmp/lh/cmp; mkdir -p "$OUT"
PAGES=("" "books/cheers-to-monday" "books/focus-nature-mandala-colouring-book" "sets/kindness-set-of-3" "books")
for p in "${PAGES[@]}"; do
  n=$(echo "home_$p" | tr "/" "_")
  for side in "before:$BEFORE" "after:$AFTER"; do
    label=${side%%:*}; port=${side##*:}
    for i in 1 2 3; do
      npx -y lighthouse@12 "http://localhost:$port/$p" --quiet --chrome-flags="--headless=new" \
        --only-categories=performance,seo,accessibility,best-practices --output=json \
        --output-path="$OUT/$label-$n-$i.json" >/dev/null 2>&1
    done
  done
  echo "done /$p"
done
