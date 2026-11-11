import "server-only";
import { clientKey, rateLimit } from "@/server/rate-limit";
import { hasDatabase } from "@/server/env";
import { checkOrderToken } from "./token";

/**
 * Private order pages (receipt, order status, invoice) open only with the order
 * number AND its private link token: 22 characters of an HMAC signed with the
 * server's secret (about 130 bits), so it can't be guessed or derived from the
 * order number. A visitor who keeps trying wrong links is blocked for an hour,
 * even for links that would be valid, so nobody can script through order numbers.
 */
export async function privateOrderLinkOk(orderNumber: string, token: string | null | undefined) {
  const failuresKey = await clientKey("bad-order-link");
  if (hasDatabase()) {
    const { db } = await import("@/server/db");
    const row = await db.rateLimit.findUnique({ where: { key: failuresKey } }).catch(() => null);
    if (row && row.resetAt > new Date() && row.count >= 20) return false;
  }
  const valid = /^GS-\d{7}$/.test(orderNumber) && checkOrderToken(orderNumber, token);
  if (!valid) await rateLimit(failuresKey, 20, 3600); // count this failure
  return valid;
}
