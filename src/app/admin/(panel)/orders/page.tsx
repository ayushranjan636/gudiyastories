import Link from "next/link";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/admin";
import { Badge, btn, Empty, inputCls, ORDER_TONE, PageHeader, Table, Tabs } from "@/components/admin/ui";
import { STATUS_LABEL } from "@/features/orders/public";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/format";
import type { Prisma } from "@/generated/prisma/client";
import { CONFIRMED } from "@/features/orders/leads";

export const metadata = { title: "Orders" };

// Confirmed (paid) orders only. Checkouts that were never paid are not orders:
// they are under Admin → Leads and never reach the packing list.
const TABS = ["all", "PAID", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"] as const;
const TAB_LABEL: Record<string, string> = { all: "All orders" };

function statusWhere(tab: string): Prisma.OrderWhereInput {
  if (tab === "all") return CONFIRMED;
  return { ...CONFIRMED, status: tab as Prisma.OrderWhereInput["status"] };
}

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; channel?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const status = TABS.includes(sp.status as (typeof TABS)[number]) ? sp.status! : "all";
  const q = sp.q?.trim().slice(0, 80);

  // Lazy expiry, so unpaid orders don't sit in "Waiting for payment" between cron runs.
  await db.order.updateMany({ where: { status: "PENDING_PAYMENT", expiresAt: { lt: new Date() } }, data: { status: "EXPIRED" } });

  const where: Prisma.OrderWhereInput = {
    ...statusWhere(status),
    ...(sp.channel ? { channel: sp.channel as Prisma.OrderWhereInput["channel"] } : {}),
    ...(q
      ? {
          OR: [
            { number: { contains: q, mode: "insensitive" } },
            { contactName: { contains: q, mode: "insensitive" } },
            { contactPhone: { contains: q.replace(/\D/g, "") || q } },
          ],
        }
      : {}),
  };
  const [orders, counts] = await Promise.all([
    db.order.findMany({ where, orderBy: { createdAt: "desc" }, take: 100, include: { _count: { select: { items: true } } } }),
    db.order.groupBy({ by: ["status"], where: CONFIRMED, _count: { _all: true } }),
  ]);
  const sum = (pred: (st: string) => boolean) => counts.filter((c) => pred(c.status)).reduce((n, c) => n + c._count._all, 0);
  const count = (t: string) => (t === "all" ? sum(() => true) : sum((st) => st === t));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description={
          <>
            Confirmed (paid) orders only. Checkouts that weren&apos;t paid are in{" "}
            <Link href="/admin/leads" className="text-leaf underline underline-offset-2">
              Leads
            </Link>
            .
          </>
        }
        actions={
          <>
            <a href={`/admin/export/orders?status=${status}`} className={btn.secondary}>
              Export CSV
            </a>
            <Link href="/admin/orders/new" className={btn.primary}>
              New manual order
            </Link>
          </>
        }
      />
      <Tabs
        active={`/admin/orders?status=${status}`}
        items={TABS.map((t) => ({ href: `/admin/orders?status=${t}`, label: TAB_LABEL[t] ?? STATUS_LABEL[t] ?? t, count: count(t) }))}
      />
      <form className="flex max-w-md gap-2">
        <input type="hidden" name="status" value={status} />
        <label className="sr-only" htmlFor="q">
          Search orders
        </label>
        <input id="q" name="q" defaultValue={q} placeholder="Order number, name or phone" className={inputCls} />
        <button className={btn.secondary}>Search</button>
      </form>
      {orders.length ? (
        <Table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Channel</th>
              <th>Payment</th>
              <th className="text-right">Total</th>
              <th>Placed</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>
                  <Link href={`/admin/orders/${o.id}`} className="font-mono font-medium text-leaf hover:underline">
                    {o.number}
                  </Link>
                </td>
                <td>
                  {o.contactName}
                  <span className="block text-ink-soft">{o.shipCity}</span>
                </td>
                <td>
                  <Badge tone={ORDER_TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge>
                </td>
                <td className="capitalize">{o.channel.toLowerCase()}</td>
                <td>{o.paymentMethod === "COD" ? "Cash on delivery" : o.paymentMethod === "RAZORPAY" ? "Online" : o.paymentMethod.replace("_", " ").toLowerCase()}</td>
                <td className="text-right tabular-nums">{formatINR(o.totalPaise)}</td>
                <td className="text-ink-soft">{formatDate(o.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <Empty>No orders here yet. An order appears here only after its payment goes through.</Empty>
      )}
    </div>
  );
}
