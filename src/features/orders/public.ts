import "server-only";
import { hasDatabase } from "@/server/env";

export const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Waiting for payment",
  PAID: "Confirmed",
  PACKED: "Packed",
  SHIPPED: "On its way",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",
  REFUNDED: "Refunded",
  EXPIRED: "Payment not completed",
};

/** Public view of an order: no address or phone, unless the phone matches. */
export async function getPublicOrder(number: string, phone?: string, linkToken?: string) {
  if (!hasDatabase() || !/^GS-\d{7}$/.test(number)) return null;
  const { db } = await import("@/server/db");
  const o = await db.order.findUnique({
    where: { number },
    include: {
      items: true,
      payments: { orderBy: { createdAt: "desc" } },
      shipments: { orderBy: { shippedAt: "desc" } },
      events: { orderBy: { createdAt: "asc" }, where: { status: { not: null } } },
    },
  });
  if (!o) return null;
  const digits = (s: string) => s.replace(/\D/g, "").slice(-10);
  const { checkOrderToken } = await import("./token");
  const verified = (phone ? digits(phone) === digits(o.contactPhone) : false) || checkOrderToken(o.number, linkToken);
  return {
    number: o.number,
    status: o.status,
    statusLabel: STATUS_LABEL[o.status] ?? o.status,
    firstName: o.contactName.split(" ")[0] ?? "",
    paymentMethod: o.paymentMethod,
    createdAt: o.createdAt,
    items: o.items.map((i) => ({ title: i.title, quantity: i.quantity, lineTotalPaise: i.lineTotalPaise })),
    subtotalPaise: o.subtotalPaise,
    discountPaise: o.discountPaise,
    shippingPaise: o.shippingPaise,
    codFeePaise: o.codFeePaise,
    totalPaise: o.totalPaise,
    shipment: o.shipments[0] ?? null,
    contactEmail: o.contactEmail,
    paidAt: o.paidAt,
    payment: o.payments[0]
      ? { status: o.payments[0].status, gatewayPaymentId: o.payments[0].razorpayPaymentId, amountPaise: o.payments[0].amountPaise, instrument: o.payments[0].instrument }
      : null,
    events: o.events.map((e) => ({ status: e.status!, message: e.message, at: e.createdAt })),
    address: verified ? `${o.shipName}, ${o.shipLine1}${o.shipLine2 ? `, ${o.shipLine2}` : ""}, ${o.shipCity}, ${o.shipState} ${o.shipPinCode}` : null,
  };
}

export type PublicOrder = NonNullable<Awaited<ReturnType<typeof getPublicOrder>>>;
