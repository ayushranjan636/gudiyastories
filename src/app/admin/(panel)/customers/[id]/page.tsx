import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/admin";
import { Badge, Card, ORDER_TONE, Table } from "@/components/admin/ui";
import { STATUS_LABEL } from "@/features/orders/public";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/format";

export default async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const c = await db.customer.findUnique({ where: { id }, include: { orders: { orderBy: { createdAt: "desc" } }, addresses: true } });
  if (!c) notFound();
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/customers" className="text-small text-ink-soft hover:text-ink">← Customers</Link>
        <h1 className="mt-2 text-h3">{c.name}</h1>
        <p className="text-small text-ink-soft">
          {c.phone}{c.email ? ` · ${c.email}` : ""} · customer since {formatDate(c.createdAt)} · {c.marketingConsent ? "opted in to emails" : "order emails only"}
        </p>
      </div>
      <Card title="Orders">
        <Table className="border-0 bg-transparent">
          <thead><tr><th>Order</th><th>Status</th><th>Placed</th><th className="text-right">Total</th></tr></thead>
          <tbody>
            {c.orders.map((o) => (
              <tr key={o.id}>
                <td><Link href={`/admin/orders/${o.id}`} className="font-mono text-leaf hover:underline">{o.number}</Link></td>
                <td><Badge tone={ORDER_TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge></td>
                <td className="text-ink-soft">{formatDate(o.createdAt)}</td>
                <td className="text-right tabular-nums">{formatINR(o.totalPaise)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
