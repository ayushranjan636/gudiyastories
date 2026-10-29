import Link from "next/link";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/admin";
import { Badge, btn, Empty, inputCls, PageHeader, Table } from "@/components/admin/ui";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { PAID_STATUSES } from "@/server/reports";

export const metadata = { title: "Customers" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const admin = await requireAdmin();
  const q = (await searchParams).q?.trim().slice(0, 80);
  const customers = await db.customer.findMany({
    where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }, { email: { contains: q, mode: "insensitive" } }] } : {},
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { orders: { where: { status: { in: [...PAID_STATUSES] } }, select: { totalPaise: true, createdAt: true } } },
  });
  const rows = customers
    .map((c) => ({ ...c, spent: c.orders.reduce((n, o) => n + o.totalPaise, 0), last: c.orders.reduce<Date | null>((d, o) => (!d || o.createdAt > d ? o.createdAt : d), null) }))
    .sort((a, b) => b.spent - a.spent);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Everyone who has ordered. Marketing consent is tracked separately from order emails."
        actions={admin.role === "OWNER" ? <a download href="/admin/export/customers" className={btn.secondary}>Export CSV</a> : null}
      />
      <form className="flex max-w-md gap-2">
        <input name="q" defaultValue={q} placeholder="Name, phone or email" aria-label="Search customers" className={inputCls} />
        <button className={btn.secondary}>Search</button>
      </form>
      {rows.length ? (
        <Table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Phone</th>
              <th className="text-right">Orders</th>
              <th className="text-right">Spent</th>
              <th>Last order</th>
              <th>Emails</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link href={`/admin/customers/${c.id}`} className="font-medium hover:text-leaf">{c.name}</Link>
                  <span className="block text-ink-soft">{c.email ?? ""}</span>
                </td>
                <td className="tabular-nums">{c.phone}</td>
                <td className="text-right tabular-nums">{c.orders.length}</td>
                <td className="text-right tabular-nums">{formatINR(c.spent)}</td>
                <td className="text-ink-soft">{c.last ? formatDate(c.last) : "–"}</td>
                <td>{c.marketingConsent ? <Badge tone="green">opted in</Badge> : <Badge>orders only</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <Empty>No customers yet.</Empty>
      )}
    </div>
  );
}
