// Pure pricing maths. The server always recomputes totals from the catalogue;
// nothing the browser sends about prices is trusted.

export type PricedLine = {
  productId: string;
  slug: string;
  sku: string;
  title: string;
  type: "STORY" | "COLOURING" | "BUNDLE";
  values: string[];
  unitPricePaise: number;
  unitMrpPaise: number;
  quantity: number;
};

export type CouponRule = {
  code: string;
  type: "PERCENTAGE" | "FIXED";
  /** PERCENTAGE: whole percent. FIXED: paise. */
  amount: number;
  minOrderPaise: number | null;
  restrictedProductIds: string[];
  restrictedValueSlugs: string[];
};

export type ShippingRules = { flatRatePaise: number; freeFromPaise: number | null; codEnabled: boolean; codFeePaise: number };

export type Totals = {
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  codFeePaise: number;
  totalPaise: number;
  couponError: string | null;
};

export function lineTotal(l: PricedLine) {
  return l.unitPricePaise * l.quantity;
}

export function couponDiscount(lines: PricedLine[], c: CouponRule | null): { discountPaise: number; error: string | null } {
  if (!c) return { discountPaise: 0, error: null };
  const subtotal = lines.reduce((n, l) => n + lineTotal(l), 0);
  if (c.minOrderPaise && subtotal < c.minOrderPaise) {
    return { discountPaise: 0, error: `This code needs an order of ₹${Math.ceil(c.minOrderPaise / 100)} or more.` };
  }
  const restricted = c.restrictedProductIds.length > 0 || c.restrictedValueSlugs.length > 0;
  const eligible = lines
    .filter(
      (l) =>
        !restricted ||
        c.restrictedProductIds.includes(l.productId) ||
        l.values.some((v) => c.restrictedValueSlugs.includes(v)),
    )
    .reduce((n, l) => n + lineTotal(l), 0);
  if (eligible === 0) return { discountPaise: 0, error: "This code doesn't apply to the books in your bag." };
  const raw = c.type === "PERCENTAGE" ? Math.floor((eligible * Math.min(100, Math.max(0, c.amount))) / 100) : c.amount;
  return { discountPaise: Math.min(raw, eligible), error: null };
}

export function computeTotals(lines: PricedLine[], rules: ShippingRules, coupon: CouponRule | null, cod: boolean): Totals {
  const subtotalPaise = lines.reduce((n, l) => n + lineTotal(l), 0);
  const { discountPaise, error } = couponDiscount(lines, coupon);
  const afterDiscount = subtotalPaise - discountPaise;
  const free = rules.freeFromPaise != null && afterDiscount >= rules.freeFromPaise;
  const shippingPaise = lines.length === 0 || free ? 0 : rules.flatRatePaise;
  const codFeePaise = cod && rules.codEnabled ? rules.codFeePaise : 0;
  return {
    subtotalPaise,
    discountPaise,
    shippingPaise,
    codFeePaise,
    totalPaise: afterDiscount + shippingPaise + codFeePaise,
    couponError: error,
  };
}
