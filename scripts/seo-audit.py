#!/usr/bin/env python3
"""Fetch the live sitemap and every URL in it; report SEO head tags per page."""
import json, re, sys, urllib.request, html
from concurrent.futures import ThreadPoolExecutor

BASE = sys.argv[1] if len(sys.argv) > 1 else "https://gudiyastories.com"
UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"

def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, dict(r.headers), r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read().decode("utf-8", "replace")

def meta(doc, attr, name):
    m = re.search(rf'<meta[^>]+{attr}="{re.escape(name)}"[^>]*content="([^"]*)"', doc) or re.search(rf'<meta[^>]+content="([^"]*)"[^>]*{attr}="{re.escape(name)}"', doc)
    return html.unescape(m.group(1)) if m else None

def audit(url):
    st, hd, doc = get(url)
    head = doc.split("</head>")[0]
    title = re.search(r"<title>(.*?)</title>", head, re.S)
    canon = re.search(r'<link rel="canonical" href="([^"]+)"', head)
    h1s = re.findall(r"<h1[^>]*>(.*?)</h1>", doc, re.S)
    lds = re.findall(r'<script type="application/ld\+json">(.*?)</script>', doc, re.S)
    types = []
    for l in lds:
        try:
            d = json.loads(l)
            types.append(d.get("@type") if isinstance(d, dict) else "list")
        except Exception as e:
            types.append(f"INVALID:{e}")
    imgs = re.findall(r"<img\b[^>]*>", doc)
    noalt = [i for i in imgs if not re.search(r'\balt="', i)]
    body_text = re.sub(r"<script.*?</script>|<style.*?</style>|<[^>]+>", " ", doc.split("<body", 1)[-1], flags=re.S)
    words = len(re.findall(r"\w+", body_text))
    return {
        "url": url.replace(BASE, "") or "/", "status": st,
        "title": html.unescape(title.group(1)) if title else None,
        "desc": meta(head, "name", "description"),
        "canonical": canon.group(1).replace(BASE, "") if canon else None,
        "robots": meta(head, "name", "robots"),
        "og:title": meta(head, "property", "og:title"), "og:image": (meta(head, "property", "og:image") or "")[:80],
        "og:url": meta(head, "property", "og:url"),
        "twitter": meta(head, "name", "twitter:card"),
        "h1": [re.sub("<[^>]+>", "", h).strip() for h in h1s],
        "jsonld": types, "imgs": len(imgs), "imgs_no_alt": len(noalt), "words": words,
    }

st, _, sm = get(f"{BASE}/sitemap.xml")
urls = re.findall(r"<loc>(.*?)</loc>", sm)
extra = [f"{BASE}{p}" for p in sys.argv[2:]]
with ThreadPoolExecutor(8) as ex:
    rows = list(ex.map(audit, urls + extra))
print(f"sitemap status {st}, {len(urls)} urls")
for r in rows:
    print(json.dumps(r, ensure_ascii=False))
