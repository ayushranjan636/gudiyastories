import "server-only";
import { db } from "./db";
import { Prisma } from "@/generated/prisma/client";

export const PAID_STATUSES = ["PAID", "PACKED", "SHIPPED", "DELIVERED"] as const;

export type Range = { key: string; label: string; from: Date; to: Date; prevFrom: Date; prevTo: Date; days: number };

const RANGES: Record<string, { label: string; days: number }> = {
  today: { label: "Today", days: 1 },
  "7d": { label: "Last 7 days", days: 7 },
  "30d": { label: "Last 30 days", days: 30 },
  "90d": { label: "Last 90 days", days: 90 },
  "365d": { label: "Last 12 months", days: 365 },
};

/** Ranges are whole days in India time. */
export function parseRange(key?: string): Range {
  const k = key && RANGES[key] ? key : "30d";
  const { label, days } = RANGES[k]!;
  const istOffset = 330 * 60_000;
  const nowIst = new Date(Date.now() + istOffset);
  const endIst = Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate() + 1);
  const to = new Date(endIst - istOffset);
  const from = new Date(to.getTime() - days * 86_400_000);
  return { key: k, label, from, to, prevFrom: new Date(from.getTime() - days * 86_400_000), prevTo: from, days };
}

export const RANGE_OPTIONS = Object.entries(RANGES).map(([key, v]) => ({ key, label: v.label }));

async function salesTotals(from: Date, to: Date) {
  const where = { status: { in: [...PAID_STATUSES] }, createdAt: { gte: from, lt: to } };
  const [agg, units, newCustomers] = await Promise.all([
    db.order.aggregate({ where, _sum: { totalPaise: true }, _count: { _all: true } }),
    db.orderItem.aggregate({ where: { order: where }, _sum: { quantity: true } }),
    db.customer.count({ where: { createdAt: { gte: from, lt: to }, orders: { some: { status: { in: [...PAID_STATUSES] } } } } }),
  ]);
  const revenue = agg._sum.totalPaise ?? 0;
  const orders = agg._count._all;
  return { revenue, orders, aov: orders ? Math.round(revenue / orders) : 0, units: units._sum.quantity ?? 0, newCustomers };
}

async function sessions(from: Date, to: Date) {
  const rows = await db.analyticsEvent.findMany({
    where: { type: "page_view", createdAt: { gte: from, lt: to } },
    distinct: ["sessionId"],
    select: { sessionId: true },
  });
  return rows.length;
}

const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : a ? 100 : null);

export async function dashboard(range: Range) {
  const [cur, prev, sCur, sPrev] = await Promise.all([
    salesTotals(range.from, range.to),
    salesTotals(range.prevFrom, range.prevTo),
    sessions(range.from, range.to),
    sessions(range.prevFrom, range.prevTo),
  ]);
  const conv = sCur ? (cur.orders / sCur) * 100 : 0;
  const convPrev = sPrev ? (prev.orders / sPrev) * 100 : 0;
  return {
    kpis: {
      revenue: { value: cur.revenue, delta: pct(cur.revenue, prev.revenue) },
      orders: { value: cur.orders, delta: pct(cur.orders, prev.orders) },
      aov: { value: cur.aov, delta: pct(cur.aov, prev.aov) },
      units: { value: cur.units, delta: pct(cur.units, prev.units) },
      conversion: { value: conv, delta: convPrev ? pct(conv, convPrev) : null },
      newCustomers: { value: cur.newCustomers, delta: pct(cur.newCustomers, prev.newCustomers) },
      sessions: { value: sCur, delta: pct(sCur, sPrev) },
    },
  };
}

/** Daily revenue and orders, filled for days with no sales. */
export async function dailySeries(range: Range) {
  const rows = await db.$queryRaw<{ day: Date; revenue: bigint; orders: bigint }[]>(Prisma.sql`
    SELECT date_trunc('day', "createdAt" AT TIME ZONE 'Asia/Kolkata') AS day,
           COALESCE(SUM("totalPaise"), 0)::bigint AS revenue,
           COUNT(*)::bigint AS orders
    FROM "Order"
    WHERE "status"::text IN ('PAID','PACKED','SHIPPED','DELIVERED')
      AND "createdAt" >= ${range.from} AND "createdAt" < ${range.to}
    GROUP BY 1 ORDER BY 1`);
  const sess = await db.$queryRaw<{ day: Date; sessions: bigint }[]>(Prisma.sql`
    SELECT date_trunc('day', "createdAt" AT TIME ZONE 'Asia/Kolkata') AS day, COUNT(DISTINCT "sessionId")::bigint AS sessions
    FROM "AnalyticsEvent" WHERE "type" = 'page_view' AND "createdAt" >= ${range.from} AND "createdAt" < ${range.to}
    GROUP BY 1 ORDER BY 1`);
  const key = (d: Date) => d.toISOString().slice(0, 10);
  const byDay = new Map(rows.map((r) => [key(r.day), r]));
  const sByDay = new Map(sess.map((r) => [key(r.day), Number(r.sessions)]));
  const out: { day: string; revenue: number; orders: number; sessions: number }[] = [];
  for (let i = 0; i < range.days; i++) {
    const d = new Date(range.from.getTime() + 330 * 60_000 + i * 86_400_000);
    const k = d.toISOString().slice(0, 10);
    const r = byDay.get(k);
    out.push({ day: k, revenue: r ? Number(r.revenue) / 100 : 0, orders: r ? Number(r.orders) : 0, sessions: sByDay.get(k) ?? 0 });
  }
  return out;
}

export async function salesBreakdowns(range: Range) {
  const where = { status: { in: [...PAID_STATUSES] }, createdAt: { gte: range.from, lt: range.to } };
  const [byChannel, items, byState] = await Promise.all([
    db.order.groupBy({ by: ["channel"], where, _sum: { totalPaise: true }, _count: { _all: true } }),
    db.orderItem.groupBy({ by: ["productId", "title"], where: { order: where }, _sum: { quantity: true, lineTotalPaise: true } }),
    db.order.groupBy({ by: ["shipState"], where, _sum: { totalPaise: true }, _count: { _all: true } }),
  ]);
  const productValues = await db.productValue.findMany({ include: { value: true } });
  const valuesByProduct = new Map<string, string[]>();
  for (const pv of productValues) valuesByProduct.set(pv.productId, [...(valuesByProduct.get(pv.productId) ?? []), pv.value.name]);
  const byValue = new Map<string, number>();
  for (const it of items) {
    for (const v of valuesByProduct.get(it.productId ?? "") ?? []) byValue.set(v, (byValue.get(v) ?? 0) + (it._sum.lineTotalPaise ?? 0));
  }
  return {
    channels: byChannel
      .map((c) => ({ name: c.channel, revenue: (c._sum.totalPaise ?? 0) / 100, orders: c._count._all }))
      .sort((a, b) => b.revenue - a.revenue),
    topProducts: items
      .map((i) => ({ productId: i.productId, title: i.title, units: i._sum.quantity ?? 0, revenue: i._sum.lineTotalPaise ?? 0 }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8),
    values: [...byValue.entries()].map(([name, paise]) => ({ name, revenue: paise / 100 })).sort((a, b) => b.revenue - a.revenue),
    states: byState
      .map((s) => ({ name: s.shipState, orders: s._count._all, revenue: (s._sum.totalPaise ?? 0) / 100 }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 10),
  };
}

export async function funnel(range: Range) {
  const types = ["page_view", "product_view", "add_to_bag", "checkout_started", "purchase"] as const;
  const counts = await Promise.all(
    types.map((t) =>
      db.analyticsEvent
        .findMany({ where: { type: t, createdAt: { gte: range.from, lt: range.to } }, distinct: ["sessionId"], select: { sessionId: true } })
        .then((r) => r.length),
    ),
  );
  const labels = ["Visited", "Viewed a book", "Added to bag", "Started checkout", "Paid"];
  return types.map((t, i) => ({ step: labels[i]!, sessions: counts[i]! }));
}

export async function stockLevels() {
  const [products, sums] = await Promise.all([
    db.product.findMany({
      where: { status: { not: "ARCHIVED" } },
      orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
      include: { bundleItems: true, stockMovements: { orderBy: { createdAt: "desc" }, take: 1 } },
    }),
    db.stockMovement.groupBy({ by: ["productId"], _sum: { quantity: true } }),
  ]);
  const onHand = new Map(sums.map((s) => [s.productId, s._sum.quantity ?? 0]));
  // Reserved: units in orders still waiting for payment.
  const pending = await db.orderItem.findMany({
    where: { order: { status: "PENDING_PAYMENT" } },
    include: { product: { include: { bundleItems: true } } },
  });
  const reserved = new Map<string, number>();
  for (const it of pending) {
    if (!it.product) continue;
    if (it.product.type === "BUNDLE") for (const bi of it.product.bundleItems) reserved.set(bi.componentId, (reserved.get(bi.componentId) ?? 0) + bi.quantity * it.quantity);
    else reserved.set(it.product.id, (reserved.get(it.product.id) ?? 0) + it.quantity);
  }
  return products.map((p) => {
    const hand =
      p.type === "BUNDLE"
        ? p.bundleItems.length
          ? Math.min(...p.bundleItems.map((bi) => Math.floor((onHand.get(bi.componentId) ?? 0) / bi.quantity)))
          : 0
        : (onHand.get(p.id) ?? 0);
    const res = p.type === "BUNDLE" ? 0 : (reserved.get(p.id) ?? 0);
    return {
      id: p.id,
      sku: p.sku,
      title: p.title,
      type: p.type,
      status: p.status,
      onHand: hand,
      reserved: res,
      available: Math.max(0, hand - res),
      threshold: p.lowStockThreshold,
      low: p.type !== "BUNDLE" && hand - res <= p.lowStockThreshold,
      lastMovementAt: p.stockMovements[0]?.createdAt ?? null,
    };
  });
}

export async function trafficReports(range: Range) {
  const where = { createdAt: { gte: range.from, lt: range.to } };
  const [pages, referrers, campaigns, devices, productViews, adds, downloads] = await Promise.all([
    db.analyticsEvent.groupBy({ by: ["path"], where: { ...where, type: "page_view" }, _count: { _all: true }, orderBy: { _count: { path: "desc" } }, take: 15 }),
    db.analyticsEvent.groupBy({ by: ["referrerHost"], where: { ...where, type: "page_view", referrerHost: { not: null } }, _count: { _all: true }, orderBy: { _count: { referrerHost: "desc" } }, take: 10 }),
    db.analyticsEvent.groupBy({ by: ["utmSource", "utmMedium", "utmCampaign"], where: { ...where, type: "page_view", utmSource: { not: null } }, _count: { _all: true }, orderBy: { _count: { utmSource: "desc" } }, take: 10 }),
    db.analyticsEvent.groupBy({ by: ["device"], where: { ...where, type: "page_view" }, _count: { _all: true } }),
    db.analyticsEvent.groupBy({ by: ["productId"], where: { ...where, type: "product_view", productId: { not: null } }, _count: { _all: true } }),
    db.analyticsEvent.groupBy({ by: ["productId"], where: { ...where, type: "add_to_bag", productId: { not: null } }, _count: { _all: true } }),
    db.resourceDownload.groupBy({ by: ["resourceId"], where, _count: { _all: true } }),
  ]);
  const sold = await db.orderItem.groupBy({
    by: ["productId"],
    where: { order: { status: { in: [...PAID_STATUSES] }, createdAt: { gte: range.from, lt: range.to } } },
    _sum: { quantity: true, lineTotalPaise: true },
  });
  const products = await db.product.findMany({ select: { id: true, title: true, costPaise: true } });
  const resources = await db.resource.findMany({ select: { id: true, title: true } });
  const title = new Map(products.map((p) => [p.id, p.title]));
  const cost = new Map(products.map((p) => [p.id, p.costPaise]));
  const addMap = new Map(adds.map((a) => [a.productId, a._count._all]));
  const soldMap = new Map(sold.map((s) => [s.productId, s]));
  return {
    pages: pages.map((p) => ({ path: p.path, views: p._count._all })),
    referrers: referrers.map((r) => ({ host: r.referrerHost ?? "", visits: r._count._all })),
    campaigns: campaigns.map((c) => ({ source: c.utmSource ?? "", medium: c.utmMedium ?? "", campaign: c.utmCampaign ?? "", visits: c._count._all })),
    devices: devices.map((d) => ({ device: d.device ?? "unknown", views: d._count._all })),
    productConversion: products
      .map((p) => {
        const views = productViews.find((v) => v.productId === p.id)?._count._all ?? 0;
        const s = soldMap.get(p.id);
        const units = s?._sum.quantity ?? 0;
        const revenue = s?._sum.lineTotalPaise ?? 0;
        const c = cost.get(p.id);
        return {
          title: title.get(p.id) ?? "",
          views,
          addedToBag: addMap.get(p.id) ?? 0,
          unitsSold: units,
          revenuePaise: revenue,
          marginPaise: c != null ? revenue - c * units : null,
        };
      })
      .filter((r) => r.views || r.unitsSold || r.addedToBag)
      .sort((a, b) => b.revenuePaise - a.revenuePaise),
    downloads: downloads
      .map((d) => ({ title: resources.find((r) => r.id === d.resourceId)?.title ?? "", downloads: d._count._all }))
      .sort((a, b) => b.downloads - a.downloads),
  };
}
