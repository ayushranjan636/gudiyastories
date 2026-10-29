"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/server/db";
import { audit, requireAdmin } from "@/server/admin";
import { sendEmail } from "@/server/email";
import { SITE } from "@/config/site";
import { unitsForOrder, newOrderNumber, confirmOrder } from "@/features/orders/service";
import { getCatalogue } from "@/features/catalogue/repo";
import { createHash, randomBytes } from "node:crypto";

export type ActionResult = { ok: boolean; message: string };

async function load(id: string) {
  const o = await db.order.findUnique({ where: { id } });
  if (!o) throw new Error("Order not found");
  return o;
}

async function notify(orderId: string, subject: string, text: string) {
  const o = await db.order.findUnique({ where: { id: orderId } });
  if (o?.contactEmail) await sendEmail({ to: o.contactEmail, subject, text });
}

export async function markPacked(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const o = await load(id);
  if (o.status !== "PAID") return { ok: false, message: "Only confirmed orders can be packed." };
  await db.order.update({ where: { id }, data: { status: "PACKED", packedAt: new Date(), events: { create: { status: "PACKED", message: "Packed", adminUserId: admin.id } } } });
  await audit(admin, "UPDATE", "Order", id, { status: o.status }, { status: "PACKED" });
  revalidatePath(`/admin/orders/${id}`);
  return { ok: true, message: "Marked as packed." };
}

const shipSchema = z.object({
  courier: z.string().trim().min(2).max(60),
  trackingNumber: z.string().trim().min(3).max(60),
  trackingUrl: z.union([z.literal(""), z.string().trim().url()]).optional(),
});

export async function markShipped(id: string, input: z.input<typeof shipSchema>): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = shipSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Add the courier and a tracking number." };
  const o = await load(id);
  if (o.status !== "PAID" && o.status !== "PACKED") return { ok: false, message: "This order can't be shipped from its current status." };
  const s = parsed.data;
  await db.order.update({
    where: { id },
    data: {
      status: "SHIPPED",
      shippedAt: new Date(),
      packedAt: o.packedAt ?? new Date(),
      shipments: { create: { courier: s.courier, trackingNumber: s.trackingNumber, trackingUrl: s.trackingUrl || null } },
      events: { create: { status: "SHIPPED", message: `Shipped with ${s.courier}, tracking ${s.trackingNumber}`, adminUserId: admin.id } },
    },
  });
  await audit(admin, "UPDATE", "Order", id, { status: o.status }, { status: "SHIPPED", ...s });
  await notify(
    id,
    `Your Gudiya Stories order ${o.number} is on its way`,
    `Hello ${o.contactName.split(" ")[0]},\n\nYour books have left Tirupati with ${s.courier}.\nTracking number: ${s.trackingNumber}${s.trackingUrl ? `\nTrack it here: ${s.trackingUrl}` : ""}\n\nYou can also check at ${SITE.url}/track.\n\nGudiya Stories`,
  );
  revalidatePath(`/admin/orders/${id}`);
  return { ok: true, message: "Marked as shipped. The customer has been emailed if they gave an email." };
}

export async function markDelivered(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const o = await load(id);
  if (o.status !== "SHIPPED") return { ok: false, message: "Only shipped orders can be marked delivered." };
  await db.$transaction([
    db.order.update({ where: { id }, data: { status: "DELIVERED", deliveredAt: new Date(), events: { create: { status: "DELIVERED", message: "Delivered", adminUserId: admin.id } } } }),
    db.shipment.updateMany({ where: { orderId: id, deliveredAt: null }, data: { deliveredAt: new Date() } }),
    ...(o.paymentMethod === "COD"
      ? [db.payment.updateMany({ where: { orderId: id, status: "CREATED" }, data: { status: "CAPTURED", capturedAt: new Date() } })]
      : []),
  ]);
  await audit(admin, "UPDATE", "Order", id, { status: o.status }, { status: "DELIVERED" });

  // A private link to review the books. Only its hash is stored.
  const token = randomBytes(24).toString("base64url");
  await db.order.update({ where: { id }, data: { reviewTokenHash: createHash("sha256").update(token).digest("hex") } });
  await notify(
    id,
    "How did the books go down?",
    `Hello ${o.contactName.split(" ")[0]},\n\nYour Gudiya Stories order ${o.number} was delivered. Once you've read them together, we'd love to hear what your child made of the books. It takes a minute:\n\n${SITE.url}/review/${token}\n\nThank you,\nGudiya Stories`,
  );
  revalidatePath(`/admin/orders/${id}`);
  return { ok: true, message: o.paymentMethod === "COD" ? "Delivered, and the cash payment is recorded." : "Marked as delivered." };
}

export async function cancelOrder(id: string, restock: boolean, reason: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const o = await load(id);
  if (!["PENDING_PAYMENT", "PAID", "PACKED", "EXPIRED"].includes(o.status)) return { ok: false, message: "Shipped orders can't be cancelled; record a return instead." };
  const stockWasTaken = o.status === "PAID" || o.status === "PACKED";
  await db.$transaction(async (tx) => {
    if (restock && stockWasTaken) {
      const units = await unitsForOrder(tx, id);
      for (const [productId, qty] of units) {
        await tx.stockMovement.create({ data: { productId, type: "RETURN", quantity: qty, orderId: id, reason: `Cancelled ${o.number}`, adminUserId: admin.id } });
      }
    }
    await tx.order.update({
      where: { id },
      data: { status: "CANCELLED", cancelledAt: new Date(), events: { create: { status: "CANCELLED", message: `Cancelled${reason ? `: ${reason}` : ""}`, adminUserId: admin.id } } },
    });
  });
  await audit(admin, "UPDATE", "Order", id, { status: o.status }, { status: "CANCELLED", restock, reason });
  revalidatePath(`/admin/orders/${id}`);
  const paidOnline = o.paymentMethod === "RAZORPAY" && stockWasTaken;
  return { ok: true, message: paidOnline ? "Cancelled. It was paid online, so issue a refund below." : "Cancelled." };
}

export async function refundOrder(id: string, amountRupees: number, restock: boolean, reason: string): Promise<ActionResult> {
  const admin = await requireAdmin("OWNER");
  const o = await db.order.findUnique({ where: { id }, include: { payments: true, refunds: true } });
  if (!o) return { ok: false, message: "Order not found." };
  const payment = o.payments.find((p) => p.status === "CAPTURED" || p.status === "PARTIALLY_REFUNDED");
  const amountPaise = Math.round(amountRupees * 100);
  const refunded = o.refunds.reduce((n, r) => n + r.amountPaise, 0);
  if (!payment) return { ok: false, message: "There is no captured payment to refund." };
  if (amountPaise <= 0 || amountPaise + refunded > payment.amountPaise) return { ok: false, message: "The amount is more than what is left to refund." };

  let razorpayRefundId: string | null = null;
  if (payment.method === "RAZORPAY" && payment.razorpayPaymentId) {
    try {
      const { refundPayment } = await import("@/features/payments/gateway");
      razorpayRefundId = (await refundPayment(payment.razorpayPaymentId, amountPaise, { order: o.number, reason })).id;
    } catch (err) {
      console.error("[refund]", err);
      return { ok: false, message: "Razorpay refused the refund. Check the Razorpay dashboard." };
    }
  }
  const full = amountPaise + refunded >= payment.amountPaise;
  await db.$transaction(async (tx) => {
    await tx.refund.create({
      data: { orderId: id, paymentId: payment.id, razorpayRefundId, amountPaise, reason: reason || null, restocked: restock, status: razorpayRefundId ? "PENDING" : "PROCESSED", adminUserId: admin.id },
    });
    await tx.payment.update({ where: { id: payment.id }, data: { status: full ? "REFUNDED" : "PARTIALLY_REFUNDED" } });
    if (restock) {
      const units = await unitsForOrder(tx, id);
      for (const [productId, qty] of units) {
        await tx.stockMovement.create({ data: { productId, type: "RETURN", quantity: qty, orderId: id, reason: `Refund ${o.number}`, adminUserId: admin.id } });
      }
    }
    await tx.order.update({
      where: { id },
      data: {
        status: full ? "REFUNDED" : o.status,
        events: { create: { status: full ? "REFUNDED" : null, message: `Refunded ₹${amountRupees}${reason ? `: ${reason}` : ""}`, adminUserId: admin.id } },
      },
    });
  });
  await audit(admin, "CREATE", "Refund", id, undefined, { amountPaise, restock, reason });
  revalidatePath(`/admin/orders/${id}`);
  return { ok: true, message: razorpayRefundId ? "Refund sent to Razorpay. Banks usually take 5 to 7 working days." : "Refund recorded." };
}

export async function saveNote(id: string, note: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  await db.order.update({ where: { id }, data: { internalNotes: note.slice(0, 4000) } });
  await audit(admin, "UPDATE", "Order", id, undefined, { internalNotes: true });
  revalidatePath(`/admin/orders/${id}`);
  return { ok: true, message: "Note saved." };
}

const manualSchema = z.object({
  channel: z.enum(["WHATSAPP", "PHONE", "BULK", "OFFLINE", "AMAZON", "FLIPKART"]),
  paid: z.boolean(),
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^(\+91)?[6-9]\d{9}$/, "Enter a 10-digit mobile number"),
  email: z.union([z.literal(""), z.string().email()]).optional(),
  line1: z.string().trim().min(2).max(200),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pinCode: z.string().trim().regex(/^[1-9]\d{5}$/),
  shippingRupees: z.coerce.number().min(0).max(10000),
  discountRupees: z.coerce.number().min(0).max(1000000),
  lines: z.array(z.object({ slug: z.string(), quantity: z.coerce.number().int().min(1).max(10000), unitRupees: z.coerce.number().min(0).max(100000) })).min(1),
  note: z.string().max(1000).optional(),
});

export async function createManualOrder(input: z.input<typeof manualSchema>): Promise<ActionResult & { id?: string }> {
  const admin = await requireAdmin();
  const parsed = manualSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." };
  const d = parsed.data;
  const { products } = await getCatalogue();
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const lines = d.lines.flatMap((l) => {
    const p = bySlug.get(l.slug);
    return p ? [{ p, quantity: l.quantity, unit: Math.round(l.unitRupees * 100) }] : [];
  });
  if (!lines.length) return { ok: false, message: "Add at least one book." };
  const phone = d.phone.startsWith("+91") ? d.phone : `+91${d.phone}`;
  const subtotal = lines.reduce((n, l) => n + l.unit * l.quantity, 0);
  const discount = Math.min(subtotal, Math.round(d.discountRupees * 100));
  const shipping = Math.round(d.shippingRupees * 100);

  const order = await db.$transaction(async (tx) => {
    const customer = await tx.customer.upsert({
      where: { phone },
      create: { name: d.name, phone, email: d.email || null },
      update: { name: d.name, ...(d.email ? { email: d.email } : {}) },
    });
    return tx.order.create({
      data: {
        number: await newOrderNumber(tx),
        status: "PENDING_PAYMENT",
        channel: d.channel,
        paymentMethod: "MANUAL",
        customerId: customer.id,
        contactName: d.name,
        contactPhone: phone,
        contactEmail: d.email || null,
        shipName: d.name,
        shipPhone: phone,
        shipLine1: d.line1,
        shipCity: d.city,
        shipState: d.state,
        shipPinCode: d.pinCode,
        subtotalPaise: subtotal,
        discountPaise: discount,
        shippingPaise: shipping,
        totalPaise: subtotal - discount + shipping,
        internalNotes: d.note || null,
        createdById: admin.id,
        items: {
          create: lines.map((l) => ({
            productId: l.p.id,
            sku: l.p.sku,
            title: l.p.title,
            productType: l.p.type,
            unitPricePaise: l.unit,
            unitMrpPaise: l.p.mrpPaise,
            quantity: l.quantity,
            lineTotalPaise: l.unit * l.quantity,
          })),
        },
        payments: { create: { method: "MANUAL", amountPaise: subtotal - discount + shipping } },
        events: { create: { status: "PENDING_PAYMENT", message: `Created by ${admin.name} (${d.channel.toLowerCase()})`, adminUserId: admin.id } },
      },
    });
  });
  if (d.paid) await confirmOrder(order.id, { instrument: "manual" });
  await audit(admin, "CREATE", "Order", order.id, undefined, { number: order.number, channel: d.channel });
  redirect(`/admin/orders/${order.id}`);
}

export async function markManualPaid(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const o = await load(id);
  if (o.status !== "PENDING_PAYMENT" && o.status !== "EXPIRED") return { ok: false, message: "This order is already confirmed." };
  await confirmOrder(id, { instrument: "manual" });
  await audit(admin, "UPDATE", "Order", id, { status: o.status }, { status: "PAID" });
  revalidatePath(`/admin/orders/${id}`);
  return { ok: true, message: "Payment recorded and stock deducted." };
}

/** Asks Razorpay directly whether this order was paid (for when a customer says "I paid"). */
export async function checkPaymentWithRazorpay(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const { paymentMode } = await import("@/features/payments/gateway");
  if ((await paymentMode()) !== "razorpay") return { ok: false, message: "Razorpay keys are not set, so there is nothing to check." };
  const { reconcileOrder } = await import("@/features/payments/reconcile");
  try {
    const r = await reconcileOrder(id);
    await audit(admin, "UPDATE", "Order", id, undefined, { paymentCheck: r });
    revalidatePath(`/admin/orders/${id}`);
    if (r === "paid") return { ok: true, message: "Razorpay confirms the payment. The order is now paid and the customer has been sent their receipt." };
    if (r === "mismatch") return { ok: false, message: "Razorpay has a payment, but not for this order's total. See the timeline; it was not confirmed." };
    if (r === "failed") return { ok: false, message: "Razorpay shows only failed attempts for this order." };
    return { ok: false, message: "No successful payment on Razorpay for this order yet." };
  } catch (err) {
    return { ok: false, message: `Could not reach Razorpay: ${err instanceof Error ? err.message : "unknown error"}` };
  }
}
