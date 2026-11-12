#!/usr/bin/env python3
"""
Is the important content in the server HTML (no JavaScript)? For each page, fetch
the raw HTML like a crawler and check the facts a searcher needs are in it.

  python3 scripts/seo-nojs-check.py http://localhost:3100
"""
import re, sys, urllib.request, html

BASE = (sys.argv[1] if len(sys.argv) > 1 else "https://gudiyastories.com").rstrip("/")
CHECKS = {
    "/": ["Gudiya Stories", "S.V. Bharathi", "/books/"],
    "/books": ["Cheers to Monday", "Spread Love", "₹", "/books/cheers-to-monday", "/sets/"],
    "/books/cheers-to-monday": ["Cheers to Monday", "₹130", "978-93-340-3675-6", "Ages 6–8", "12", "S.V. Bharathi", "What it&#x27;s about", "Questions parents ask", "Paperback", "/books/kindness"],
    "/books/focus-nature-mandala-colouring-book": ["Nature Mandala", "978-93-341-9159-2", "36", "Ages 5+", "/books/mandala-colouring-books"],
    "/sets/kindness-set-of-3": ["Kindness set of 3", "₹399", "/books/cheers-to-monday", "/books/spread-love", "/books/rainbows-birthday-bash"],
    "/books/kindness": ["Books about kindness", "/books/spread-love"],
    "/help/shipping": ["₹60", "₹499"],
}
bad = 0
for path, needles in CHECKS.items():
    req = urllib.request.Request(BASE + path, headers={"User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)"})
    raw = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")
    body = raw.split("<body", 1)[-1]
    # Only real markup, not the RSC payload in <script> tags, counts as crawlable text.
    visible = re.sub(r"<script\b.*?</script>", " ", body, flags=re.S)
    missing = [n for n in needles if n not in visible and html.unescape(n) not in html.unescape(visible)]
    links = len(set(re.findall(r'<a [^>]*href="(/[^"#?]*)"', visible)))
    print(f"{'✓' if not missing else '✗'} {path:48} {links:3} internal links in HTML" + (f"  MISSING: {missing}" if missing else ""))
    bad += bool(missing)
sys.exit(1 if bad else 0)
