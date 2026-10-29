// Allow-list HTML sanitiser for content written in the admin editor.
// Admins are trusted, but this keeps a stolen admin session from planting scripts.

const ALLOWED = new Set([
  "p", "br", "strong", "b", "em", "i", "u", "s", "a", "ul", "ol", "li", "blockquote", "h2", "h3", "h4",
  "hr", "img", "figure", "figcaption", "code", "pre", "span", "div", "iframe", "video",
]);
const ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "title", "target", "rel"]),
  img: new Set(["src", "alt", "width", "height", "loading"]),
  iframe: new Set(["src", "width", "height", "allowfullscreen", "title"]),
  video: new Set(["src", "poster", "controls", "playsinline", "preload", "muted", "loop"]),
  div: new Set(["data-product", "class"]),
  span: new Set(["class"]),
  p: new Set(["class"]),
};

const SAFE_URL = /^(https?:|mailto:|tel:|\/(?!\/)|#)/i;
const SAFE_IFRAME = /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com)\/embed\//i;

export function sanitizeHtml(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|object|embed|form|input|textarea|select|button|svg|math)[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (full, rawTag: string, rawAttrs: string) => {
      const tag = rawTag.toLowerCase();
      if (!ALLOWED.has(tag)) return "";
      if (full.startsWith("</")) return `</${tag}>`;
      const allowed = ATTRS[tag];
      const attrs: string[] = [];
      if (allowed) {
        for (const m of rawAttrs.matchAll(/([a-zA-Z-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) {
          const name = m[1]!.toLowerCase();
          const value = m[3] ?? m[4] ?? "";
          if (!allowed.has(name)) continue;
          if ((name === "href" || name === "src" || name === "poster") && !SAFE_URL.test(value.trim())) continue;
          if (tag === "iframe" && name === "src" && !SAFE_IFRAME.test(value.trim())) continue;
          attrs.push(`${name}="${value.replace(/"/g, "&quot;")}"`);
        }
        if (tag === "a" && attrs.some((a) => a.startsWith('target="_blank"'))) attrs.push('rel="noopener noreferrer"');
      }
      const selfClosing = tag === "img" || tag === "br" || tag === "hr";
      return `<${tag}${attrs.length ? " " + attrs.join(" ") : ""}${selfClosing ? " /" : ""}>`;
    });
}

/** Shows a video's first frame instead of a black box before it plays. */
export function withVideoStills(html: string): string {
  return html.replace(/<video src="([^"#]+)"/g, '<video src="$1#t=0.1"');
}

/**
 * Questions and answers from a post's "Frequently asked questions" section
 * (an h2 with that title, then an h3 per question followed by its answer), for
 * FAQ structured data that search engines can show as rich results.
 */
export function faqFromHtml(html: string): { q: string; a: string }[] {
  const text = (h: string) => h.replace(/<[^>]+>/g, "").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").trim();
  const start = html.search(/<h2[^>]*>\s*(frequently asked questions|faqs?)\s*<\/h2>/i);
  if (start < 0) return [];
  const rest = html.slice(start).replace(/^<h2[^>]*>[\s\S]*?<\/h2>/i, "");
  const section = rest.split(/<h2[\s>]/i)[0] ?? "";
  const out: { q: string; a: string }[] = [];
  for (const m of section.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3[\s>]|$)/gi)) {
    const q = text(m[1] ?? "");
    const a = text(m[2] ?? "");
    if (q && a) out.push({ q, a });
  }
  return out;
}
