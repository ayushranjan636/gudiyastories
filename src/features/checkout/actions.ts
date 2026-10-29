"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { getCatalogue } from "@/features/catalogue/repo";
import { hasDatabase } from "@/server/env";
import { createGatewayOrder, paymentMode, verifyCheckoutSignature } from "@/features/payments/gateway";
import { orderToken } from "@/features/orders/token";
import { getShippingRules } from "@/server/settings";
import { clientKey, rateLimit } from "@/server/rate-limit";
import { computeTotals, type CouponRule, type PricedLine, type Totals } from "./pricing";
import { SITE, whatsappLink } from "@/config/site";
import { formatINR } from "@/lib/money";

const lineSchema = z.object({ slug: z.string().max(120), quantity: z.number().int().min(1).max(20) });

async function priceLines(lines: { slug: string; quantity: number }[]) {
  const { products } = await getCatalogue();
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const priced: PricedLine[] = [];
  const problems: string[] = [];
  for (const l of lines) {
    const p = bySlug.get(l.slug);
    if (!p) {
      problems.push(`One item in your bag is no longer sold and was left out.`);
      continue;
    }
    if (p.available != null && p.available < l.quantity) {
      problems.push(p.available === 0 ? `${p.title} is out of stock.` : `Only ${p.available} of ${p.title} left.`);
    }
    priced.push({
      productId: p.id,
      slug: p.slug,
      sku: p.sku,
      title: p.title,
      type: p.type,
      values: p.values,
      unitPricePaise: p.pricePaise,
      unitMrpPaise: p.mrpPaise,
      quantity: l.quantity,
    });
  }
  return { priced, problems };
}

async function findCoupon(code: string | undefined, customerPhone?: string): Promise<{ rule: CouponRule | null; id: string | null; error: string | null }> {
  const c = code?.trim().toUpperCase();
  if (!c) return { rule: null, id: null, error: null };
  if (!hasDatabase()) return { rule: null, id: null, error: "Codes can't be used right now." };
  const { db } = await import("@/server/db");
  const coupon = await db.coupon.findUnique({ where: { code: c }, include: { restrictedValues: true, _count: { select: { redemptions: true } } } });
  const now = new Date();
  if (!coupon || !coupon.active || (coupon.startsAt && coupon.startsAt > now) || (coupon.endsAt && coupon.endsAt < now)) {
    return { rule: null, id: null, error: "That code isn't valid." };
  }
  if (coupon.usageLimitTotal != null && coupon._count.redemptions >= coupon.usageLimitTotal) {
    return { rule: null, id: null, error: "That code has been fully used." };
  }
  if (customerPhone && (coupon.usageLimitPerCustomer != null || coupon.firstOrderOnly)) {
    const customer = await db.customer.findUnique({ where: { phone: customerPhone }, select: { id: true } });
    if (customer) {
      if (coupon.firstOrderOnly) {
        const paid = await db.order.count({ where: { customerId: customer.id, status: { in: ["PAID", "PACKED", "SHIPPED", "DELIVERED"] } } });
        if (paid > 0) return { rule: null, id: null, error: "That code is for first orders only." };
      }
      if (coupon.usageLimitPerCustomer != null) {
        const used = await db.couponRedemption.count({ where: { couponId: coupon.id, customerId: customer.id } });
        if (used >= coupon.usageLimitPerCustomer) return { rule: null, id: null, error: "You've already used that code." };
      }
    }
  }
  return {
    id: coupon.id,
    error: null,
    rule: {
      code: coupon.code,
      type: coupon.type,
      amount: coupon.amount,
      minOrderPaise: coupon.minOrderPaise,
      restrictedProductIds: coupon.restrictedProductIds,
      restrictedValueSlugs: coupon.restrictedValues.map((v) => v.slug),
    },
  };
}

export type Quote = Totals & {
  problems: string[];
  canPayOnline: boolean;
  codAvailable: boolean;
  lines: { slug: string; title: string; quantity: number; lineTotalPaise: number }[];
};

export async function quoteCheckout(input: { lines: { slug: string; quantity: number }[]; coupon?: string; cod?: boolean }): Promise<Quote> {
  const lines = z.array(lineSchema).max(30).parse(input.lines);
  const [{ priced, problems }, rules, coupon, mode] = await Promise.all([priceLines(lines), getShippingRules(), findCoupon(input.coupon), paymentMode()]);
  const totals = computeTotals(priced, rules, coupon.rule, Boolean(input.cod));
  return {
    ...totals,
    couponError: coupon.error ?? totals.couponError,
    problems,
    canPayOnline: hasDatabase() && mode === "razorpay",
    codAvailable: rules.codEnabled,
    lines: priced.map((l) => ({ slug: l.slug, title: l.title, quantity: l.quantity, lineTotalPaise: l.unitPricePaise * l.quantity })),
  };
}

const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, "").replace(/^0/, ""))
  .refine((v) => /^(\+91)?[6-9]\d{9}$/.test(v), "Enter a 10-digit Indian mobile number")
  .transform((v) => (v.startsWith("+91") ? v : `+91${v}`));

const checkoutSchema = z.object({
  lines: z.array(lineSchema).min(1, "Your bag is empty").max(30),
  name: z.string().trim().min(2, "Enter your name").max(120),
  phone,
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]).optional(),
  line1: z.string().trim().min(3, "Enter the house and street").max(200),
  line2: z.string().trim().max(200).optional(),
  landmark: z.string().trim().max(120).optional(),
  city: z.string().trim().min(2, "Enter the city").max(80),
  state: z.string().trim().min(2, "Enter the state").max(80),
  pinCode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a 6-digit PIN code"),
  note: z.string().trim().max(500).optional(),
  coupon: z.string().trim().max(40).optional(),
  method: z.enum(["RAZORPAY", "COD", "WHATSAPP"]),
  marketing: z.boolean().default(false),
  /** The total the customer saw. If the server's total differs, nothing is charged. */
  expectedTotalPaise: z.number().int().nonnegative(),
});

export type CheckoutInput = z.input<typeof checkoutSchema>;
export type PlaceResult =
  | { ok: false; error: string; fieldErrors?: Record<string, string>; priceChanged?: boolean }
  | { ok: true; kind: "whatsapp"; url: string }
  | { ok: true; kind: "cod"; orderNumber: string; token: string }
  | {
      ok: true;
      kind: "razorpay";
      orderNumber: string;
      token: string;
      gatewayOrderId: string;
      amountPaise: number;
      keyId: string;
      name: string;
      email?: string;
      phone: string;
    };

export async function placeOrder(input: CheckoutInput): Promise<PlaceResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { ok: false, error: "Some details need another look.", fieldErrors };
  }
  const d = parsed.data;
  if (!(await rateLimit(await clientKey("checkout"), 20, 3600))) {
    return { ok: false, error: "Too many attempts. Please wait a little, or order on WhatsApp." };
  }

  const [{ priced, problems }, rules, coupon] = await Promise.all([priceLines(d.lines), getShippingRules(), findCoupon(d.coupon, d.phone)]);
  if (problems.length) return { ok: false, error: problems.join(" ") };
  if (coupon.error) return { ok: false, error: coupon.error, fieldErrors: { coupon: coupon.error } };
  const totals = computeTotals(priced, rules, coupon.rule, d.method === "COD");
  if (totals.totalPaise !== d.expectedTotalPaise) {
    return {
      ok: false,
      priceChanged: true,
      error: `The total is now ${formatINR(totals.totalPaise)} (a price or delivery charge changed). Nothing was charged. Please check and try again.`,
    };
  }

  const address = [d.line1, d.line2, d.landmark, `${d.city}, ${d.state} ${d.pinCode}`].filter(Boolean).join(", ");

  if (d.method === "WHATSAPP" || !hasDatabase()) {
    const msg = [
      `Hello ${SITE.name}, I would like to order:`,
      ...priced.map((l) => `• ${l.quantity} × ${l.title} (${l.sku}) ${formatINR(l.unitPricePaise * l.quantity)}`),
      totals.discountPaise ? `Discount (${coupon.rule?.code}): -${formatINR(totals.discountPaise)}` : null,
      `Delivery: ${totals.shippingPaise ? formatINR(totals.shippingPaise) : "Free"}`,
      `Total: ${formatINR(totals.totalPaise)}`,
      "",
      `Name: ${d.name}`,
      `Phone: ${d.phone}`,
      d.email ? `Email: ${d.email}` : null,
      `Address: ${address}`,
      d.note ? `Note: ${d.note}` : null,
    ]
      .filter((x) => x !== null)
      .join("\n");
    return { ok: true, kind: "whatsapp", url: whatsappLink(msg) };
  }

  if (d.method === "COD" && !rules.codEnabled) return { ok: false, error: "Cash on delivery isn't available right now." };
  if (d.method === "RAZORPAY" && (await paymentMode()) === "none") return { ok: false, error: "Online payment isn't set up yet. Please order on WhatsApp." };

  const { db } = await import("@/server/db");
  const { newOrderNumber, confirmOrder } = await import("@/features/orders/service");
  const h = await headers();
  const ref = new URL(h.get("referer") ?? SITE.url);

  const order = await db.$transaction(async (tx) => {
    const customer = await tx.customer.upsert({
      where: { phone: d.phone },
      create: {
        name: d.name,
        phone: d.phone,
        email: d.email || null,
        marketingConsent: d.marketing,
        marketingConsentAt: d.marketing ? new Date() : null,
      },
      update: {
        name: d.name,
        ...(d.email ? { email: d.email } : {}),
        ...(d.marketing ? { marketingConsent: true, marketingConsentAt: new Date() } : {}),
      },
    });
    const number = await newOrderNumber(tx);
    return tx.order.create({
      data: {
        number,
        status: "PENDING_PAYMENT",
        channel: "WEBSITE",
        paymentMethod: d.method === "COD" ? "COD" : "RAZORPAY",
        customerId: customer.id,
        contactName: d.name,
        contactPhone: d.phone,
        contactEmail: d.email || null,
        shipName: d.name,
        shipPhone: d.phone,
        shipLine1: d.line1,
        shipLine2: d.line2 || null,
        shipLandmark: d.landmark || null,
        shipCity: d.city,
        shipState: d.state,
        shipPinCode: d.pinCode,
        subtotalPaise: totals.subtotalPaise,
        discountPaise: totals.discountPaise,
        shippingPaise: totals.shippingPaise,
        codFeePaise: totals.codFeePaise,
        totalPaise: totals.totalPaise,
        couponId: coupon.id,
        couponCode: coupon.rule?.code ?? null,
        customerNote: d.note || null,
        utmSource: ref.searchParams.get("utm_source"),
        utmMedium: ref.searchParams.get("utm_medium"),
        utmCampaign: ref.searchParams.get("utm_campaign"),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        items: {
          create: priced.map((l) => ({
            productId: l.productId,
            sku: l.sku,
            title: l.title,
            productType: l.type,
            unitPricePaise: l.unitPricePaise,
            unitMrpPaise: l.unitMrpPaise,
            quantity: l.quantity,
            lineTotalPaise: l.unitPricePaise * l.quantity,
          })),
        },
        events: { create: { status: "PENDING_PAYMENT", message: "Order placed on the website" } },
        payments: { create: { method: d.method === "COD" ? "COD" : "RAZORPAY", amountPaise: totals.totalPaise } },
      },
      include: { payments: true },
    });
  });

  if (d.method === "COD") {
    await confirmOrder(order.id, null);
    return { ok: true, kind: "cod", orderNumber: order.number, token: orderToken(order.number) };
  }

  // The gateway order is created for exactly the order total stored above.
  let gw;
  try {
    gw = await createGatewayOrder({ amountPaise: order.totalPaise, receipt: order.number, orderId: order.id });
  } catch (err) {
    console.error("[payments] could not create Razorpay order", order.number, err instanceof Error ? err.message : err);
    await db.order.update({ where: { id: order.id }, data: { status: "EXPIRED" } }).catch(() => {});
    return { ok: false, error: "We couldn't open the payment window just now. Nothing was charged. Please try again in a minute, or order on WhatsApp." };
  }
  await db.payment.update({ where: { id: order.payments[0]!.id }, data: { razorpayOrderId: gw.gatewayOrderId } });

  return {
    ok: true,
    kind: "razorpay",
    orderNumber: order.number,
    token: orderToken(order.number),
    gatewayOrderId: gw.gatewayOrderId,
    amountPaise: order.totalPaise,
    keyId: gw.keyId,
    name: d.name,
    email: d.email || undefined,
    phone: d.phone,
  };
}

/** Called by the browser after Razorpay Checkout succeeds. Confirms only after Razorpay itself says the money arrived. */
export async function verifyPayment(input: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) {
  const v = z
    .object({ razorpay_order_id: z.string().max(64), razorpay_payment_id: z.string().max(64), razorpay_signature: z.string().max(256) })
    .parse(input);
  if (!hasDatabase() || !(await verifyCheckoutSignature(v.razorpay_order_id, v.razorpay_payment_id, v.razorpay_signature))) return { ok: false as const };

  const { db } = await import("@/server/db");
  const { settleReportedPayment } = await import("@/features/payments/reconcile");
  const payment = await db.payment.findUnique({ where: { razorpayOrderId: v.razorpay_order_id }, include: { order: true } });
  if (!payment) return { ok: false as const };
  const done = { orderNumber: payment.order.number, token: orderToken(payment.order.number) };
  try {
    // The signature proves the browser didn't make this up; Razorpay's own record
    // proves the money (right amount, right order) actually arrived.
    const r = await settleReportedPayment(v.razorpay_order_id, v.razorpay_payment_id, v.razorpay_signature);
    return r.state === "paid" ? { ok: true as const, ...done } : { ok: false as const, ...done };
  } catch (err) {
    // Razorpay unreachable for a moment: the order page and the background check finish the job.
    console.error("[payments] verify", err instanceof Error ? err.message : err);
    return { ok: false as const, ...done };
  }
}

export async function lookupPin(pin: string): Promise<{ city: string; state: string } | null> {
  if (!/^[1-9]\d{5}$/.test(pin)) return null;
  if (hasDatabase()) {
    try {
      const { db } = await import("@/server/db");
      const hit = await db.pinCode.findUnique({ where: { pinCode: pin } });
      if (hit) return { city: hit.city, state: hit.state };
    } catch {
      /* fall through to the API */
    }
  }
  const base = process.env.PINCODE_API_URL ?? "https://api.postalpincode.in/pincode";
  try {
    const res = await fetch(`${base}/${pin}`, { next: { revalidate: 60 * 60 * 24 * 30 } });
    const data = (await res.json()) as { Status: string; PostOffice?: { District: string; State: string; Block?: string }[] }[];
    const po = data?.[0]?.PostOffice?.[0];
    if (!po) return null;
    const out = { city: po.District, state: po.State };
    if (hasDatabase()) {
      const { db } = await import("@/server/db");
      await db.pinCode.upsert({ where: { pinCode: pin }, create: { pinCode: pin, city: out.city, district: po.District, state: out.state }, update: {} }).catch(() => {});
    }
    return out;
  } catch {
    return null;
  }
}
