import { auth } from "@/auth";
import { db } from "@/server/db";
import { csvResponse } from "@/server/csv";
import { parseRange, stockLevels, trafficReports } from "@/server/reports";

export async function GET(req: Request, ctx: { params: Promise<{ report: string }> }) {
  if (!process.env.DATABASE_URL) return new Response("No database configured. Run npm run local.", { status: 503 });
  const session = await auth();
  const uid = (session?.user as { id?: string; role?: string } | undefined)?.id;
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!uid) return new Response("Unauthorized", { status: 401 });
  const admin = await db.adminUser.findUnique({ where: { id: uid }, select: { active: true, role: true } });
  if (!admin?.active) return new Response("Unauthorized", { status: 401 });

  const { report } = await ctx.params;
  const url = new URL(req.url);
  const range = parseRange(url.searchParams.get("range") ?? undefined);

  if (report === "orders") {
    const status = url.searchParams.get("status");
    const orders = await db.order.findMany({
      where: status && status !== "all" ? { status: status as never } : {},
      orderBy: { createdAt: "desc" },
      include: { items: true },
      take: 5000,
    });
    return csvResponse(
      "orders",
      orders.map((o) => ({
        number: o.number,
        placed: o.createdAt,
        status: o.status,
        channel: o.channel,
        payment: o.paymentMethod,
        name: o.contactName,
        phone: o.contactPhone,
        email: o.contactEmail ?? "",
        city: o.shipCity,
        state: o.shipState,
        pin: o.shipPinCode,
        items: o.items.map((i) => `${i.quantity}x ${i.sku}`).join(" "),
        subtotal: o.subtotalPaise / 100,
        discount: o.discountPaise / 100,
        shipping: o.shippingPaise / 100,
        total: o.totalPaise / 100,
        coupon: o.couponCode ?? "",
        utm_source: o.utmSource ?? "",
      })),
    );
  }

  if (report === "customers") {
    if (role !== "OWNER" && admin.role !== "OWNER") return new Response("Owner only", { status: 403 });
    const customers = await db.customer.findMany({ include: { orders: { select: { totalPaise: true, status: true } } }, take: 10000 });
    return csvResponse(
      "customers",
      customers.map((c) => ({
        name: c.name,
        phone: c.phone,
        email: c.email ?? "",
        orders: c.orders.length,
        spent: c.orders.filter((o) => ["PAID", "PACKED", "SHIPPED", "DELIVERED"].includes(o.status)).reduce((n, o) => n + o.totalPaise, 0) / 100,
        marketing_consent: c.marketingConsent ? "yes" : "no",
        joined: c.createdAt,
      })),
    );
  }

  if (report === "stock") {
    const rows = await stockLevels();
    return csvResponse("stock", rows.map((r) => ({ sku: r.sku, title: r.title, type: r.type, on_hand: r.onHand, reserved: r.reserved, available: r.available, alert_at: r.threshold })));
  }

  if (report === "products") {
    const t = await trafficReports(range);
    return csvResponse(
      "product-performance",
      t.productConversion.map((p) => ({ title: p.title, views: p.views, added_to_bag: p.addedToBag, units_sold: p.unitsSold, revenue: p.revenuePaise / 100, margin: p.marginPaise == null ? "" : p.marginPaise / 100 })),
    );
  }

  if (report === "traffic") {
    const t = await trafficReports(range);
    return csvResponse("top-pages", t.pages);
  }

  return new Response("Unknown report", { status: 404 });
}
