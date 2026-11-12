#!/usr/bin/env python3
"""Summarise Lighthouse JSON reports: scores, Core Web Vitals, failing audits."""
import json, sys, glob

for f in sorted(sum((glob.glob(a) for a in sys.argv[1:]), [])):
    l = json.load(open(f))
    a = l["audits"]
    cats = {k: round((v["score"] or 0) * 100) for k, v in l["categories"].items()}
    print(f"\n## {l['finalDisplayedUrl']}  {cats}")
    for k in ["first-contentful-paint", "largest-contentful-paint", "total-blocking-time", "cumulative-layout-shift", "speed-index"]:
        print(f"   {k:28} {a[k].get('displayValue','')}")
    lcp = a.get("largest-contentful-paint-element", {}).get("details", {}).get("items") or []
    if lcp:
        try:
            print("   LCP element:", lcp[0]["items"][0]["node"]["snippet"][:170])
        except Exception:
            pass
    for k, v in a.items():
        if v.get("scoreDisplayMode") in ("binary", "numeric", "metricSavings") and v.get("score") is not None and v["score"] < 0.9:
            if k in ("first-contentful-paint", "largest-contentful-paint", "total-blocking-time", "cumulative-layout-shift", "speed-index", "interactive", "max-potential-fid"):
                continue
            print(f"   ✗ {k}: {v.get('title','')} {v.get('displayValue','')}")
