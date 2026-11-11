import { hasDatabase } from "@/server/env";

/**
 * Sends every email a paid order should have had but didn't (for example orders
 * placed before email was set up): the confirmation + "new order" notice, then
 * the latest status update (packed / on its way / delivered). Safe to run more
 * than once: nothing is sent twice. Call with: Authorization: Bearer CRON_SECRET
 *   POST /api/cron/backfill-emails?days=30
 */
export async function POST(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!hasDatabase()) return Response.json({ skipped: true });
  const days = Math.min(90, Math.max(1, Number(new URL(req.url).searchParams.get("days")) || 30));

  const { db } = await import("@/server/db");
  const { sendOrderEmails } = await import("@/features/orders/service");
  const { sendStatusEmail } = await import("@/features/orders/notifications");
  const { createHash, randomBytes } = await import("node:crypto");
  const { SITE } = await import("@/config/site");

  const orders = await db.order.findMany({
    where: { paidAt: { gte: new Date(Date.now() - days * 86400_000) }, status: { in: ["PAID", "PACKED", "SHIPPED", "DELIVERED"] } },
    include: { shipments: { orderBy: { shippedAt: "desc" }, take: 1 } },
    orderBy: { paidAt: "asc" },
  });

  const report: { order: string; confirmation: string; update: string }[] = [];
  for (const o of orders) {
    const before = { c: o.customerEmailedAt, w: o.ownerEmailedAt };
    await sendOrderEmails(o.id).catch(() => {});
    const after = await db.order.findUnique({ where: { id: o.id }, select: { customerEmailedAt: true, ownerEmailedAt: true } });
    const confirmation = before.c && before.w ? "already sent" : after?.customerEmailedAt ? "sent" : "not sent";

    let update = "none needed";
    if (o.status === "PACKED") update = await sendStatusEmail(o.id, { kind: "packed" });
    if (o.status === "SHIPPED" && o.shipments[0]) {
      const s = o.shipments[0];
      update = await sendStatusEmail(o.id, { kind: "shipped", courier: s.courier, trackingNumber: s.trackingNumber, trackingUrl: s.trackingUrl });
    }
    if (o.status === "DELIVERED") {
      // The original review link can't be recovered (only its hash is kept), so issue a fresh one.
      const token = randomBytes(24).toString("base64url");
      const already = await db.orderEvent.findFirst({ where: { orderId: o.id, message: "Customer emailed: delivered" }, select: { id: true } });
      if (!already) await db.order.update({ where: { id: o.id }, data: { reviewTokenHash: createHash("sha256").update(token).digest("hex") } });
      update = await sendStatusEmail(o.id, { kind: "delivered", reviewUrl: already ? null : `${SITE.url.replace(/\/$/, "")}/review/${token}` });
    }
    report.push({ order: o.number, confirmation, update });
  }
  return Response.json({ checked: orders.length, report });
}
