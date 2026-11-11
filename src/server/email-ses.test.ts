import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { buildMime } from "./email-ses";

const decodePart = (mime: string, type: string) => {
  const m = mime.match(new RegExp(`Content-Type: ${type}[^\\r]*\\r\\nContent-Transfer-Encoding: base64\\r\\n\\r\\n([A-Za-z0-9+/=\\r\\n]+)`));
  return m ? Buffer.from(m[1]!.replace(/\r\n/g, ""), "base64").toString("utf8") : null;
};

describe("SES email (raw MIME)", () => {
  const mime = buildMime({
    from: "Gudiya Stories <noreply@gudiyastories.com>",
    to: "asha@example.com",
    replyTo: "svbharathi@gudiyastories.com",
    subject: "Refund for order GS-2600001: ₹140",
    text: "Hello Asha – your refund is on its way.",
    html: "<p>Hello Asha – ₹140</p>",
    attachments: [{ filename: "Gudiya-Stories-Invoice-GS-2600001.pdf", content: new Uint8Array([37, 80, 68, 70]), contentType: "application/pdf" }],
  });

  it("has the right headers, with non-English characters encoded", () => {
    expect(mime).toContain("From: Gudiya Stories <noreply@gudiyastories.com>");
    expect(mime).toContain("To: asha@example.com");
    expect(mime).toContain("Reply-To: svbharathi@gudiyastories.com");
    expect(mime).toMatch(/Subject: =\?UTF-8\?B\?[A-Za-z0-9+/=]+\?=/);
    expect(Buffer.from(mime.match(/Subject: =\?UTF-8\?B\?([^?]+)\?=/)![1]!, "base64").toString()).toBe("Refund for order GS-2600001: ₹140");
  });

  it("carries both a text and an HTML version", () => {
    expect(decodePart(mime, "text/plain")).toBe("Hello Asha – your refund is on its way.");
    expect(decodePart(mime, "text/html")).toBe("<p>Hello Asha – ₹140</p>");
  });

  it("attaches the invoice PDF", () => {
    expect(mime).toContain('Content-Disposition: attachment; filename="Gudiya-Stories-Invoice-GS-2600001.pdf"');
    expect(mime).toContain("Content-Type: application/pdf");
    expect(mime).toContain(Buffer.from("%PDF").toString("base64"));
  });

  it("keeps every line short enough for mail servers", () => {
    expect(mime.split("\r\n").every((l) => l.length <= 998)).toBe(true);
  });
});
