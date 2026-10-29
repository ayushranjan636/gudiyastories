// Money is stored as integer paise everywhere. Format only at the edge.

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

const inrFormatterPaise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** ₹ with Indian digit grouping, e.g. 115000 -> "₹1,150". Shows paise only when non-zero. */
export function formatINR(paise: number): string {
  if (!Number.isInteger(paise)) throw new Error("formatINR expects integer paise");
  return paise % 100 === 0 ? inrFormatter.format(paise / 100) : inrFormatterPaise.format(paise / 100);
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function sumOfSinglesPaise(components: { pricePaise: number; quantity: number }[]): number {
  return components.reduce((total, c) => total + c.pricePaise * c.quantity, 0);
}

/** Positive number = the bundle is cheaper than buying separately. */
export function bundleSavingsPaise(bundlePricePaise: number, components: { pricePaise: number; quantity: number }[]): number {
  return sumOfSinglesPaise(components) - bundlePricePaise;
}
