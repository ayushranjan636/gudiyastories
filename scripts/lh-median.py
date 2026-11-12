#!/usr/bin/env python3
"""Median Lighthouse metrics, before vs after, from /tmp/lh/cmp/{before,after}-<page>-<n>.json."""
import glob, json, re, statistics
from collections import defaultdict

runs = defaultdict(list)
for f in glob.glob("/tmp/lh/cmp/*.json"):
    m = re.match(r".*/(before|after)-(.+)-(\d)\.json$", f)
    if not m:
        continue
    l = json.load(open(f))
    a = l["audits"]
    if "largest-contentful-paint" not in a or a["largest-contentful-paint"].get("numericValue") is None:
        continue
    runs[(m.group(2), m.group(1))].append({
        "perf": round(l["categories"]["performance"]["score"] * 100),
        "a11y": round(l["categories"]["accessibility"]["score"] * 100),
        "seo": round(l["categories"]["seo"]["score"] * 100),
        "bp": round(l["categories"]["best-practices"]["score"] * 100),
        "lcp": a["largest-contentful-paint"]["numericValue"] / 1000,
        "tbt": a["total-blocking-time"]["numericValue"],
        "cls": a["cumulative-layout-shift"]["numericValue"],
        "bytes": a["total-byte-weight"]["numericValue"] / 1024,
    })

med = lambda xs, k: statistics.median(x[k] for x in xs)
pages = sorted({p for p, _ in runs})
print(f"{'page':48} {'':6} {'perf':>5} {'a11y':>5} {'seo':>4} {'bp':>4} {'LCP s':>6} {'TBT ms':>7} {'CLS':>6} {'KiB':>6}  n")
for p in pages:
    for side in ("before", "after"):
        xs = runs.get((p, side), [])
        if not xs:
            continue
        name = "/" + p.replace("home_", "", 1).replace("_", "/") if side == "before" else ""
        print(f"{name:48} {side:6} {med(xs,'perf'):5.0f} {med(xs,'a11y'):5.0f} {med(xs,'seo'):4.0f} {med(xs,'bp'):4.0f} {med(xs,'lcp'):6.2f} {med(xs,'tbt'):7.0f} {med(xs,'cls'):6.3f} {med(xs,'bytes'):6.0f}  {len(xs)}")
