import { describe, expect, it } from "vitest";
import { faqFromHtml, sanitizeHtml } from "./sanitize";

describe("sanitizeHtml", () => {
  it("removes scripts and event handlers", () => {
    const out = sanitizeHtml('<p onclick="x()">Hi<script>alert(1)</script></p><img src="/x.png" onerror="y()">');
    expect(out).toBe('<p>Hi</p><img src="/x.png" />');
  });
  it("drops javascript: links but keeps safe ones", () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).toBe("<a>x</a>");
    expect(sanitizeHtml('<a href="/books">x</a>')).toBe('<a href="/books">x</a>');
  });
  it("allows only YouTube iframes", () => {
    expect(sanitizeHtml('<iframe src="https://evil.example/x"></iframe>')).toBe("<iframe></iframe>");
    expect(sanitizeHtml('<iframe src="https://www.youtube-nocookie.com/embed/abc"></iframe>')).toContain("youtube-nocookie");
  });
  it("keeps uploaded videos but not script URLs on them", () => {
    expect(sanitizeHtml('<video src="/uploads/blog/2026-10/a.mp4" controls="true" onplay="x()"></video>')).toBe('<video src="/uploads/blog/2026-10/a.mp4" controls="true"></video>');
    expect(sanitizeHtml('<video src="javascript:alert(1)" poster="javascript:x"></video>')).toBe("<video></video>");
  });
  it("reads FAQ questions and answers for structured data", () => {
    const html = "<h2>About</h2><p>x</p><h2>Frequently asked questions</h2><h3>What age?</h3><p>3 to 9.</p><h3>Does it need Wi-Fi?</h3><p>Yes, home <strong>Wi-Fi</strong>.</p><h2>Next</h2><h3>Not a question</h3><p>z</p>";
    expect(faqFromHtml(html)).toEqual([
      { q: "What age?", a: "3 to 9." },
      { q: "Does it need Wi-Fi?", a: "Yes, home Wi-Fi." },
    ]);
  });
});
