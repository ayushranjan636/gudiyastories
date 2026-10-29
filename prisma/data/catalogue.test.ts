import { describe, expect, it } from "vitest";
import { checkWriting } from "@/lib/writing-rules";
import { BOOKS, BUNDLES, VALUES } from "./catalogue";

describe("catalogue seed data", () => {
  it("follows the writing rules", () => {
    const copy = [
      ...BOOKS.flatMap((b) => [b.title, b.shortDescription, b.cover.alt]),
      ...BUNDLES.flatMap((b) => [b.title, b.shortDescription]),
      ...VALUES.map((v) => v.description),
    ];
    for (const text of copy) expect(checkWriting(text), text).toEqual([]);
  });

  it("prices every bundle below the sum of its singles", () => {
    const price = new Map(BOOKS.map((b) => [b.sku, b.priceRupees]));
    const expected: Record<string, number> = { "SET-ADV3": 450, "SET-KIND3": 440, "SET-ALL6": 890, "SET-FOCUS3": 1190 };
    for (const bundle of BUNDLES) {
      const sum = bundle.componentSkus.reduce((s, sku) => s + (price.get(sku) ?? NaN), 0);
      expect(sum, bundle.sku).toBe(expected[bundle.sku]);
      expect(bundle.priceRupees, bundle.sku).toBeLessThan(sum);
    }
  });

  it("has unique SKUs, slugs and ISBNs", () => {
    const skus = [...BOOKS.map((b) => b.sku), ...BUNDLES.map((b) => b.sku)];
    expect(new Set(skus).size).toBe(skus.length);
    const slugs = [...BOOKS.map((b) => b.slug), ...BUNDLES.map((b) => b.slug)];
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(BOOKS.map((b) => b.isbn)).size).toBe(BOOKS.length);
  });
});

describe("checkWriting", () => {
  it("flags banned words, emojis and em dashes", () => {
    expect(checkWriting("An enchanting journey").map((i) => i.match)).toEqual(["enchanting", "journey"]);
    expect(checkWriting("Where stories meets play").length).toBe(1);
    expect(checkWriting("Hello 🙂")[0]?.kind).toBe("emoji");
    expect(checkWriting("Short — and wrong")[0]?.kind).toBe("em-dash");
    expect(checkWriting("Yes! Yes!")[0]?.kind).toBe("exclamations");
  });
});
