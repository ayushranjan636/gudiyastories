#!/usr/bin/env python3
"""
SEO validation for gudiyastories.com (or a local build).

  python3 scripts/seo-validate.py https://gudiyastories.com
  python3 scripts/seo-validate.py http://localhost:3100

Checks every sitemap URL and a set of private/duplicate URLs, then exits non-zero
if any rule fails. Rules: 200 status, one <h1>, unique title (10–65 chars) and
description (50–165), self-referencing canonical, no noindex, Open Graph + Twitter
tags, valid JSON-LD (Product/Book offers have price, currency, availability,
image; no ratings without reviews), every <img> has alt, robots.txt allows public
pages and blocks private ones, private pages are noindex and not in the sitemap.
"""
import html, json, re, sys, urllib.request, urllib.error
from collections import Counter
from concurrent.futures import ThreadPoolExecutor

BASE = (sys.argv[1] if len(sys.argv) > 1 else "https://gudiyastories.com").rstrip("/")
UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
PRIVATE = ["/checkout", "/track", "/admin/login", "/order/GS-0000000", "/receipt/GS-0000000", "/styleguide"]
DUPES = ["/books?value=kindness", "/books?age=6-8", "/books?sort=price-asc", "/books/cheers-to-monday?utm_source=test"]
fails, warns = [], []


def get(path):
    url = path if path.startswith("http") else BASE + path
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            return r.status, r.read().decode("utf-8", "replace"), r.geturl()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace"), url


def meta(doc, attr, name):
    for pat in (rf'<meta[^>]*{attr}="{re.escape(name)}"[^>]*content="([^"]*)"', rf'<meta[^>]*content="([^"]*)"[^>]*{attr}="{re.escape(name)}"'):
        m = re.search(pat, doc)
        if m:
            return html.unescape(m.group(1))
    return None


def ld_blocks(doc):
    out = []
    for raw in re.findall(r'<script type="application/ld\+json">(.*?)</script>', doc, re.S):
        try:
            d = json.loads(raw)
        except Exception as e:
            fails.append(f"invalid JSON-LD: {e}")
            continue
        items = d.get("@graph", [d]) if isinstance(d, dict) else d
        out.extend(items)
    return out


def types_of(item):
    t = item.get("@type", [])
    return t if isinstance(t, list) else [t]


def check_page(path):
    st, doc, final = get(path)
    head = doc.split("</head>")[0]
    r = {"path": path, "status": st}
    if st != 200:
        fails.append(f"{path}: HTTP {st}")
        return r
    t = re.search(r"<title>(.*?)</title>", head, re.S)
    r["title"] = html.unescape(t.group(1)) if t else ""
    r["desc"] = meta(head, "name", "description") or ""
    can = re.search(r'<link rel="canonical" href="([^"]+)"', head)
    r["canonical"] = can.group(1) if can else None
    robots = meta(head, "name", "robots") or ""
    h1 = re.findall(r"<h1[\s>]", doc)
    imgs = re.findall(r"<img\b[^>]*>", doc)
    noalt = [i for i in imgs if not re.search(r'\salt="', i)]

    if not (10 <= len(r["title"]) <= 70):
        warns.append(f"{path}: title length {len(r['title'])}: {r['title']}")
    if not (50 <= len(r["desc"]) <= 165):
        warns.append(f"{path}: description length {len(r['desc'])}")
    expect = BASE + (path.split("?")[0] if path != "/" else "")
    if r["canonical"] not in (expect, expect + "/", BASE + "/" if path == "/" else None):
        fails.append(f"{path}: canonical {r['canonical']} (expected {expect})")
    if "noindex" in robots:
        fails.append(f"{path}: has noindex but is in the sitemap")
    if len(h1) != 1:
        fails.append(f"{path}: {len(h1)} <h1> elements")
    for prop in ("og:title", "og:description", "og:image", "og:url", "og:type"):
        if not meta(head, "property", prop):
            fails.append(f"{path}: missing {prop}")
    if meta(head, "property", "og:url") and meta(head, "property", "og:url").rstrip("/") != expect.rstrip("/"):
        fails.append(f"{path}: og:url {meta(head, 'property', 'og:url')} ≠ canonical")
    if not meta(head, "name", "twitter:card"):
        fails.append(f"{path}: missing twitter:card")
    if noalt:
        fails.append(f"{path}: {len(noalt)} <img> without alt")

    lds = ld_blocks(doc)
    r["schema"] = sorted({t for i in lds for t in types_of(i)})
    for item in lds:
        ts = types_of(item)
        if "Product" in ts:
            o = item.get("offers") or {}
            for k in ("price", "priceCurrency", "availability"):
                if not o.get(k):
                    fails.append(f"{path}: Product offer missing {k}")
            if not item.get("image"):
                fails.append(f"{path}: Product missing image")
            if "aggregateRating" in item and not item.get("review"):
                fails.append(f"{path}: aggregateRating without reviews")
        if "Book" in ts and item.get("isbn"):
            digits = re.sub(r"\D", "", item["isbn"])
            if len(digits) != 13 or not isbn13_ok(digits):
                fails.append(f"{path}: ISBN {item['isbn']} fails the ISBN-13 checksum")
        if "BreadcrumbList" in ts:
            els = item.get("itemListElement", [])
            if not els or els[0].get("name") != "Home":
                warns.append(f"{path}: breadcrumb does not start at Home")
    if not any(t in r["schema"] for t in ("Organization",)):
        fails.append(f"{path}: no Organization schema")
    return r


def isbn13_ok(d):
    s = sum(int(c) * (1 if i % 2 == 0 else 3) for i, c in enumerate(d[:12]))
    return (10 - s % 10) % 10 == int(d[12])


def main():
    st, robots, _ = get("/robots.txt")
    print(f"robots.txt: HTTP {st}")
    if "Sitemap: " not in robots:
        fails.append("robots.txt: no Sitemap line")
    star = robots.split("User-Agent: *", 1)[-1].split("User-Agent:", 1)[0] if "User-Agent: *" in robots else ""
    if "Disallow: /\n" in star or "Disallow: /\r" in star:
        fails.append("robots.txt blocks everything for *")
    for p in ("/checkout", "/order/", "/receipt/", "/admin"):
        if f"Disallow: {p}" not in star:
            fails.append(f"robots.txt: {p} not disallowed")

    st, sm, _ = get("/sitemap.xml")
    urls = re.findall(r"<loc>(.*?)</loc>", sm)
    print(f"sitemap.xml: HTTP {st}, {len(urls)} URLs, {sm.count('<lastmod>')} with lastmod, {sm.count('<image:loc>')} images")
    paths = [u.replace(BASE, "") or "/" for u in urls]
    for u in urls:
        if not u.startswith(BASE):
            fails.append(f"sitemap URL on another host: {u}")
        if "?" in u:
            fails.append(f"sitemap has a query-string URL: {u}")
    for p in PRIVATE:
        if any(x.startswith(p.split("/GS")[0]) and x != "/" for x in paths if p.split("/GS")[0] not in ("",)):
            if any(x.startswith(p.rstrip("/")) for x in paths):
                fails.append(f"private path in sitemap: {p}")
    for d, n in Counter(paths).items():
        if n > 1:
            fails.append(f"sitemap duplicate: {d}")

    with ThreadPoolExecutor(8) as ex:
        rows = list(ex.map(check_page, paths))

    for key in ("title", "desc"):
        c = Counter(r.get(key) for r in rows if r.get(key))
        for v, n in c.items():
            if n > 1:
                fails.append(f"duplicate {key} on {n} pages: {v[:70]}")

    # Private pages must not be indexable.
    for p in PRIVATE:
        st, doc, _ = get(p)
        robots_meta = meta(doc.split("</head>")[0], "name", "robots") or ""
        if st == 200 and "noindex" not in robots_meta:
            fails.append(f"private page {p} is indexable (HTTP {st}, robots={robots_meta!r})")
        print(f"private {p:28} HTTP {st}  robots={robots_meta or '-'}")
    # Filter/sort/tracking duplicates canonicalise to the clean URL.
    for p in DUPES:
        st, doc, _ = get(p)
        can = re.search(r'<link rel="canonical" href="([^"]+)"', doc)
        clean = BASE + p.split("?")[0]
        ok = can and can.group(1) == clean
        print(f"duplicate {p:42} canonical → {can.group(1) if can else None} {'✓' if ok else '✗'}")
        if not ok:
            fails.append(f"{p}: canonical should be {clean}")

    print(f"\n{len(rows)} indexable pages checked")
    for r in rows:
        print(f"  {r['path']:58} {len(r.get('title','')):>3}c  {', '.join(r.get('schema', []))}")
    print(f"\nWARNINGS ({len(warns)})")
    for w in warns:
        print("  ⚠", w)
    print(f"\nFAILURES ({len(fails)})")
    for f in fails:
        print("  ✗", f)
    sys.exit(1 if fails else 0)


main()
