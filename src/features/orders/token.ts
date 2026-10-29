import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// A private link token for one order: the confirmation page and receipt need it,
// so knowing (or guessing) an order number alone shows nothing.
function secret() {
  return `order-link:${process.env.AUTH_SECRET ?? "local-dev"}`;
}

export function orderToken(orderNumber: string) {
  return createHmac("sha256", secret()).update(orderNumber).digest("base64url").slice(0, 22);
}

export function checkOrderToken(orderNumber: string, token: string | undefined | null) {
  if (!token) return false;
  const a = Buffer.from(orderToken(orderNumber));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function orderLinks(orderNumber: string, base: string) {
  const t = orderToken(orderNumber);
  return { page: `${base}/order/${orderNumber}?t=${t}`, receipt: `${base}/receipt/${orderNumber}?t=${t}` };
}
