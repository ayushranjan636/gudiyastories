import { describe, expect, it } from "vitest";
import { computeTotals, couponDiscount, type CouponRule, type PricedLine } from "./pricing";

const line = (over: Partial<PricedLine> = {}): PricedLine => ({
  productId: "p1",
  slug: "cheers-to-monday",
  sku: "CTM002",
  title: "Cheers to Monday",
  type: "STORY",
  values: ["kindness"],
  unitPricePaise: 13000,
  unitMrpPaise: 17900,
  quantity: 1,
  ...over,
});

const rules = { flatRatePaise: 6000, freeFromPaise: 49900, codEnabled: true, codFeePaise: 3000 };

describe("computeTotals", () => {
  it("charges flat shipping below the threshold", () => {
    const t = computeTotals([line({ quantity: 2 })], rules, null, false);
    expect(t).toMatchObject({ subtotalPaise: 26000, shippingPaise: 6000, totalPaise: 32000 });
  });

  it("ships free at or above the threshold, judged after discount", () => {
    expect(computeTotals([line({ quantity: 4 })], rules, null, false).shippingPaise).toBe(0); // 520
    const ten: CouponRule = { code: "TEN", type: "PERCENTAGE", amount: 10, minOrderPaise: null, restrictedProductIds: [], restrictedValueSlugs: [] };
    // 520 - 52 = 468, below 499
    expect(computeTotals([line({ quantity: 4 })], rules, ten, false).shippingPaise).toBe(6000);
  });

  it("adds the COD fee only when COD is enabled and chosen", () => {
    expect(computeTotals([line()], rules, null, true).codFeePaise).toBe(3000);
    expect(computeTotals([line()], { ...rules, codEnabled: false }, null, true).codFeePaise).toBe(0);
  });
});

describe("couponDiscount", () => {
  const base: CouponRule = { code: "X", type: "FIXED", amount: 5000, minOrderPaise: null, restrictedProductIds: [], restrictedValueSlugs: [] };

  it("never discounts more than the eligible amount", () => {
    expect(couponDiscount([line()], { ...base, amount: 99900 }).discountPaise).toBe(13000);
  });

  it("enforces the minimum order", () => {
    const r = couponDiscount([line()], { ...base, minOrderPaise: 50000 });
    expect(r.discountPaise).toBe(0);
    expect(r.error).toMatch(/₹500/);
  });

  it("applies value restrictions to matching lines only", () => {
    const lines = [line(), line({ productId: "p2", values: ["focus"], unitPricePaise: 42000 })];
    const r = couponDiscount(lines, { ...base, type: "PERCENTAGE", amount: 50, restrictedValueSlugs: ["focus"] });
    expect(r.discountPaise).toBe(21000);
  });
});
