import { hasDatabase } from "@/server/env";
import { ownerEmail, sendEmail } from "@/server/email";

/**
 * Daily job (AWS EventBridge, cron, or any scheduler: GET with
 * "Authorization: Bearer CRON_SECRET"). Settles and expires open payments, then sends the owner a low-stock digest and today's enquiry follow-ups.
 */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new Response("Unauthorized", { status: 401 });
  if (!hasDatabase()) return Response.json({ skipped: true });
  const { db } = await import("@/server/db");

  // Checks open payments with Razorpay first, so a paid order is never expired.
  const { reconcilePending } = await import("@/features/payments/reconcile");
  const sweep = await reconcilePending({ budgetMs: 6_000 });
  const expired = { count: sweep.expired };

  const products = await db.product.findMany({ where: { status: "ACTIVE", type: { not: "BUNDLE" } }, select: { id: true, title: true, lowStockThreshold: true } });
  const stock = await db.stockMovement.groupBy({ by: ["productId"], _sum: { quantity: true } });
  const onHand = new Map(stock.map((s) => [s.productId, s._sum.quantity ?? 0]));
  const low = products.filter((p) => (onHand.get(p.id) ?? 0) <= p.lowStockThreshold);

  const today = new Date();
  today.setUTCHours(23, 59, 59, 999);
  const followUps = await db.enquiry.findMany({
    where: { nextFollowUpOn: { lte: today }, stage: { notIn: ["WON", "LOST"] } },
    select: { organisation: true, stage: true },
  });

  if (low.length || followUps.length) {
    const text = [
      low.length ? "Running low:" : null,
      ...low.map((p) => `• ${p.title}: ${onHand.get(p.id) ?? 0} left (alert at ${p.lowStockThreshold})`),
      followUps.length ? "\nBulk enquiries to follow up today:" : null,
      ...followUps.map((e) => `• ${e.organisation} (${e.stage.toLowerCase().replace("_", " ")})`),
    ]
      .filter(Boolean)
      .join("\n");
    await sendEmail({ to: ownerEmail(), subject: "Gudiya Stories: today's stock and follow-ups", text });
  }

  return Response.json({ expired: expired.count, lowStock: low.length, followUps: followUps.length });
}
