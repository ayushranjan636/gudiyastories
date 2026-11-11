import "server-only";
import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { ownerEmail, sendEmail } from "@/server/email";
import { formatINR } from "@/lib/money";
import { SITE } from "@/config/site";
import type { Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

export async function newOrderNumber(tx: Tx = db) {
  const yy = String(new Date().getUTCFullYear()).slice(2);
  for (let i = 0; i < 6; i++) {
    const n = `GS-${yy}${String(randomInt(0, 100000)).padStart(5, "0")}`;
    if (!(await tx.order.findUnique({ where: { number: n }, select: { id: true } }))) return n;
  }
  throw new Error("Could not allocate an order number");
}

/** Units per product an order consumes, with bundles expanded into their books. */
export async function unitsForOrder(tx: Tx, orderId: string) {
  const items = await tx.orderItem.findMany({
    where: { orderId },
    include: { product: { include: { bundleItems: true } } },
  });
  const units = new Map<string, number>();
  for (const it of items) {
    if (!it.product) continue;
    if (it.product.type === "BUNDLE") {
      for (const bi of it.product.bundleItems) units.set(bi.componentId, (units.get(bi.componentId) ?? 0) + bi.quantity * it.quantity);
    } else {
      units.set(it.product.id, (units.get(it.product.id) ?? 0) + it.quantity);
    }
  }
  return units;
}

export async function onHand(tx: Tx, productIds: string[]) {
  const rows = await tx.stockMovement.groupBy({ by: ["productId"], where: { productId: { in: productIds } }, _sum: { quantity: true } });
  return new Map(rows.map((r) => [r.productId, r._sum.quantity ?? 0]));
}

/**
 * Marks an order as paid (or confirmed, for COD) exactly once: deducts stock
 * through the ledger, records the timeline and coupon use, and sends emails.
 * Safe to call from both the browser callback and the webhook.
 */
export async function confirmOrder(
  orderId: string,
  payment: { razorpayPaymentId?: string; razorpaySignature?: string; instrument?: string; raw?: Prisma.InputJsonValue } | null,
) {
  const result = await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { payments: true } });
    if (!order) throw new Error("Order not found");
    if (order.status !== "PENDING_PAYMENT" && order.status !== "EXPIRED") return { order, changed: false };

    // Conditional update: if the browser callback, the payment check and a webhook
    // all arrive at once, the row lock lets exactly one of them through.
    const now = new Date();
    const claimed = await tx.order.updateMany({
      where: { id: orderId, status: { in: ["PENDING_PAYMENT", "EXPIRED"] } },
      data: { status: "PAID", paidAt: payment ? now : null, expiresAt: null },
    });
    if (claimed.count !== 1) return { order, changed: false };
    const updated = (await tx.order.findUnique({ where: { id: orderId } }))!;
    if (order.status === "EXPIRED") {
      await tx.orderEvent.create({ data: { orderId, message: "Payment arrived after the order had expired. Confirmed anyway; check stock before packing." } });
    }

    const p = order.payments[0];
    if (p && payment) {
      await tx.payment.update({
        where: { id: p.id },
        data: {
          status: "CAPTURED",
          capturedAt: now,
          razorpayPaymentId: payment.razorpayPaymentId ?? p.razorpayPaymentId,
          razorpaySignature: payment.razorpaySignature ?? p.razorpaySignature,
          instrument: payment.instrument ?? p.instrument,
          raw: payment.raw ?? undefined,
        },
      });
    }

    const units = await unitsForOrder(tx, orderId);
    const stock = await onHand(tx, [...units.keys()]);
    const short: string[] = [];
    for (const [productId, qty] of units) {
      if ((stock.get(productId) ?? 0) < qty) short.push(productId);
      await tx.stockMovement.create({
        data: { productId, type: "SALE_WEBSITE", quantity: -qty, channel: order.channel, orderId, reason: `Order ${order.number}` },
      });
    }

    await tx.orderEvent.create({
      data: {
        orderId,
        status: "PAID",
        message: payment ? "Payment received" : "Cash on delivery order confirmed",
      },
    });
    if (short.length) {
      await tx.orderEvent.create({ data: { orderId, message: "Stock was short for at least one book when this order was confirmed. Check inventory." } });
    }
    if (order.couponId) {
      await tx.couponRedemption.upsert({
        where: { orderId },
        create: { couponId: order.couponId, orderId, customerId: order.customerId, discountPaise: order.discountPaise },
        update: {},
      });
    }
    await tx.analyticsEvent.create({
      data: { type: "purchase", sessionId: order.sessionId ?? "server", path: "/checkout", orderId, valuePaise: order.totalPaise, utmSource: order.utmSource, utmMedium: order.utmMedium, utmCampaign: order.utmCampaign },
    });
    return { order: updated, changed: true };
  });

  if (result.changed) {
    // Awaited (not fire-and-forget): on serverless hosts unfinished work is cut off
    // once the response is sent. Failures are retried by the payment check.
    await sendOrderEmails(orderId).catch((err) => console.error("[email] order", orderId, err));
    // Stock changed, so cached book pages (sold-out states) need a refresh.
    try {
      revalidatePath("/", "layout");
    } catch {
      /* outside a request (scripts): nothing cached to refresh */
    }
  }
  return result;
}

const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Two emails per paid order: a confirmation and receipt to the customer, and a
 * "new order" notice to the shop. Each is sent at most once (recorded on the
 * order); one that failed is retried by retryOrderEmails().
 */
export async function sendOrderEmails(orderId: string) {
  const o = await db.order.findUnique({ where: { id: orderId }, include: { items: true, payments: true } });
  if (!o || o.status === "PENDING_PAYMENT" || o.status === "EXPIRED") return;
  if (o.customerEmailedAt && o.ownerEmailedAt) return;
  const { orderLinks } = await import("./token");
  const links = orderLinks(o.number, SITE.url);
  const paid = o.payments.find((p) => p.status === "CAPTURED");
  const first = o.contactName.split(" ")[0] ?? "";
  const rows: [string, string][] = [
    ...o.items.map((i) => [`${i.quantity} × ${i.title}`, formatINR(i.lineTotalPaise)] as [string, string]),
    ...(o.discountPaise ? [[`Discount${o.couponCode ? ` (${o.couponCode})` : ""}`, `-${formatINR(o.discountPaise)}`] as [string, string]] : []),
    ["Delivery", o.shippingPaise ? formatINR(o.shippingPaise) : "Free"],
    ...(o.codFeePaise ? [["Cash on delivery fee", formatINR(o.codFeePaise)] as [string, string]] : []),
  ];
  const payLine =
    o.paymentMethod === "COD"
      ? `To pay on delivery: ${formatINR(o.totalPaise)}`
      : `Paid: ${formatINR(paid?.amountPaise ?? o.totalPaise)}${paid?.razorpayPaymentId ? ` (payment ID ${paid.razorpayPaymentId})` : ""}`;
  const address = `${o.shipName}, ${o.shipLine1}${o.shipLine2 ? `, ${o.shipLine2}` : ""}, ${o.shipCity}, ${o.shipState} ${o.shipPinCode}`;

  const text = [
    `Thank you, ${first}.`,
    "",
    `Your order ${o.number} is confirmed.`,
    "",
    ...rows.map(([a, b]) => `${a}  ${b}`),
    `Total  ${formatINR(o.totalPaise)}`,
    payLine,
    "",
    `Shipping to: ${address}`,
    "",
    `Your receipt: ${links.receipt}`,
    `Order status: ${links.page}`,
    "",
    "Gudiya Stories, Tirupati",
  ].join("\n");

  const html = `<!doctype html><html><body style="margin:0;background:#FBF8F1;font-family:Helvetica,Arial,sans-serif;color:#1B1A17">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border:1px solid #E4DCCB;border-radius:16px" cellpadding="0" cellspacing="0">
<tr><td style="padding:28px 28px 8px"><p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#2F6B2A;font-weight:bold">Order confirmed</p>
<h1 style="margin:8px 0 0;font-family:Georgia,serif;font-weight:normal;font-size:26px">Thank you, ${esc(first)}.</h1>
<p style="margin:8px 0 0;color:#5A5650;font-size:15px">Order <strong style="color:#1B1A17">${o.number}</strong>. We pack every order in Tirupati and send the tracking number when it ships.</p></td></tr>
<tr><td style="padding:16px 28px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
${rows.map(([a, b]) => `<tr><td style="padding:6px 0;border-bottom:1px solid #F2EBDD">${esc(a)}</td><td align="right" style="padding:6px 0;border-bottom:1px solid #F2EBDD">${b}</td></tr>`).join("")}
<tr><td style="padding:10px 0 0;font-weight:bold">Total</td><td align="right" style="padding:10px 0 0;font-weight:bold;font-size:18px">${formatINR(o.totalPaise)}</td></tr>
</table><p style="margin:12px 0 0;font-size:13px;color:#2F6B2A">${esc(payLine)}</p></td></tr>
<tr><td style="padding:0 28px 8px;font-size:13px;color:#5A5650">Shipping to ${esc(address)}</td></tr>
<tr><td style="padding:16px 28px 28px"><a href="${links.receipt}" style="display:inline-block;background:#2F6B2A;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-size:14px">View or print your receipt</a>
<a href="${links.page}" style="display:inline-block;margin-left:8px;color:#2F6B2A;font-size:14px">Order status</a></td></tr>
</table><p style="font-size:12px;color:#5A5650;margin:16px 0 0">Gudiya Stories · Tirupati, Andhra Pradesh · ${SITE.phoneDisplay}</p>
</td></tr></table></body></html>`;

  const firstTime = !o.customerEmailedAt && !o.ownerEmailedAt;

  if (!o.customerEmailedAt && o.contactEmail) {
    const r = await sendEmail({ to: o.contactEmail, subject: `Order ${o.number} confirmed`, text, html });
    if (r.sent) await db.order.update({ where: { id: o.id }, data: { customerEmailedAt: new Date() } });
  }

  if (!o.ownerEmailedAt) {
    const adminLink = `${SITE.url.replace(/\/$/, "")}/admin/orders/${o.id}`;
    const ownerText = [
      `New paid order ${o.number}: ${formatINR(o.totalPaise)}`,
      "",
      ...rows.map(([a, b]) => `${a}  ${b}`),
      `Total  ${formatINR(o.totalPaise)}`,
      payLine,
      "",
      `Customer: ${o.contactName}`,
      `Phone: ${o.contactPhone}`,
      `Email: ${o.contactEmail ?? "(none)"}`,
      `Ship to: ${address}`,
      o.customerNote ? `Note from customer: ${o.customerNote}` : null,
      "",
      `Open in admin: ${adminLink}`,
    ]
      .filter((x) => x !== null)
      .join("\n");
    const r = await sendEmail({ to: ownerEmail(), subject: `New order ${o.number}: ${formatINR(o.totalPaise)}`, text: ownerText });
    if (r.sent) await db.order.update({ where: { id: o.id }, data: { ownerEmailedAt: new Date() } });
  }

  if (firstTime) {
    const { sendOrderWhatsApp } = await import("@/server/whatsapp");
    await sendOrderWhatsApp(o.contactPhone, [first, o.number, formatINR(o.totalPaise)]).catch(() => {});
  }
}

/** Paid orders from the last 3 days whose emails didn't go out (email service down, timeout). */
export async function retryOrderEmails() {
  const pending = await db.order.findMany({
    where: {
      status: { notIn: ["PENDING_PAYMENT", "EXPIRED"] },
      // Older than 2 minutes, so this never races the first send right after payment.
      paidAt: { gte: new Date(Date.now() - 3 * 24 * 3600_000), lte: new Date(Date.now() - 2 * 60_000) },
      OR: [{ customerEmailedAt: null, contactEmail: { not: null } }, { ownerEmailedAt: null }],
    },
    select: { id: true },
    take: 20,
  });
  for (const o of pending) await sendOrderEmails(o.id).catch((err) => console.error("[email] retry", o.id, err));
  return pending.length;
}
