import Link from "next/link";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/admin";
import { dailySeries, dashboard, funnel, parseRange, RANGE_OPTIONS, salesBreakdowns, stockLevels } from "@/server/reports";
import { Badge, Card, Empty, PageHeader, Stat } from "@/components/admin/ui";
import { RangePicker } from "@/components/admin/range-picker";
import { RankBars, TrendChart } from "@/components/admin/charts";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/format";

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date()));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ range?: string; denied?: string }> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const range = parseRange(sp.range);
  const [d, series, br, fun, stock, toPack, enquiries, reviews] = await Promise.all([
    dashboard(range),
    dailySeries(range),
    salesBreakdowns(range),
    funnel(range),
    stockLevels(),
    db.order.findMany({ where: { status: "PAID" }, orderBy: { createdAt: "asc" }, take: 6, include: { _count: { select: { items: true } } } }),
    db.enquiry.findMany({ where: { stage: "NEW" }, orderBy: { createdAt: "desc" }, take: 5 }),
    db.review.count({ where: { status: "PENDING" } }),
  ]);
  const low = stock.filter((s) => s.low);
  const k = d.kpis;
  const top = fun[0]?.sessions ?? 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${greeting()}, ${admin.name.trim().split(/\s+/).pop()}`}
        description={`${range.label}, compared with the ${range.days === 1 ? "day" : `${range.days} days`} before.`}
        actions={<RangePicker base="/admin" active={range.key} options={RANGE_OPTIONS} />}
      />
      {sp.denied ? <p className="rounded-xl bg-clay/10 px-4 py-3 text-small text-clay">That page is for the owner account only.</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Revenue" value={formatINR(k.revenue.value)} delta={k.revenue.delta} />
        <Stat label="Orders" value={k.orders.value} delta={k.orders.delta} />
        <Stat label="Average order" value={formatINR(k.aov.value)} delta={k.aov.delta} />
        <Stat label="Books sold" value={k.units.value} delta={k.units.delta} />
        <Stat label="Visitors" value={k.sessions.value} delta={k.sessions.delta} hint="Unique visitors per day, added up" />
        <Stat label="Conversion" value={`${k.conversion.value.toFixed(1)}%`} delta={k.conversion.delta} hint="Orders per visitor" />
        <Stat label="New customers" value={k.newCustomers.value} delta={k.newCustomers.delta} />
        <Stat label="Reviews to check" value={reviews} hint={reviews ? "Waiting for approval" : "All caught up"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Revenue by day">
          <TrendChart data={series} dataKey="revenue" name="revenue" money />
        </Card>
        <Card title="Visitors by day">
          <TrendChart data={series} dataKey="sessions" name="visitors" />
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="Orders waiting to be packed" action={<Link href="/admin/orders?status=PAID" className="text-small text-leaf underline">All</Link>} className="xl:col-span-2">
          {toPack.length ? (
            <ul className="divide-y divide-line">
              {toPack.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="flex items-center gap-4 py-3 hover:text-leaf">
                    <span className="font-mono text-small">{o.number}</span>
                    <span className="flex-1 truncate">{o.contactName}, {o.shipCity}</span>
                    <Badge tone={o.paymentMethod === "COD" ? "amber" : "lime"}>{o.paymentMethod === "COD" ? "COD" : "Paid"}</Badge>
                    <span className="tabular-nums">{formatINR(o.totalPaise)}</span>
                    <span className="hidden text-small text-ink-soft sm:inline">{formatDate(o.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Nothing to pack right now.</Empty>
          )}
        </Card>
        <Card title="Running low" action={<Link href="/admin/inventory" className="text-small text-leaf underline">Inventory</Link>}>
          {low.length ? (
            <ul className="space-y-2.5">
              {low.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 text-small">
                  <span className="truncate">{s.title}</span>
                  <Badge tone={s.available === 0 ? "red" : "amber"}>{s.available} left</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Every book is above its alert level.</Empty>
          )}
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="Top books by revenue">
          {br.topProducts.length ? (
            <RankBars data={br.topProducts.map((p) => ({ name: p.title.replace(/^Focus: /, ""), revenue: p.revenue / 100 }))} dataKey="revenue" name="revenue" money />
          ) : (
            <Empty>No sales in this period yet.</Empty>
          )}
        </Card>
        <Card title="Sales by value">
          {br.values.length ? <RankBars data={br.values} dataKey="revenue" name="revenue" money /> : <Empty>No sales in this period yet.</Empty>}
        </Card>
        <Card title="Sales by channel">
          {br.channels.length ? (
            <RankBars data={br.channels.map((c) => ({ name: c.name.charAt(0) + c.name.slice(1).toLowerCase(), revenue: c.revenue }))} dataKey="revenue" name="revenue" money />
          ) : (
            <Empty>No sales in this period yet.</Empty>
          )}
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="From visit to purchase" className="xl:col-span-2">
          <ol className="space-y-3">
            {fun.map((f, i) => {
              const w = top ? Math.max(2, (f.sessions / top) * 100) : 0;
              const prev = i ? fun[i - 1]!.sessions : null;
              return (
                <li key={f.step} className="grid grid-cols-[9rem_1fr_6rem] items-center gap-3 text-small">
                  <span>{f.step}</span>
                  <span className="h-6 overflow-hidden rounded-[4px] bg-paper-deep">
                    <span className="block h-full rounded-[4px] bg-leaf" style={{ width: `${w}%` }} />
                  </span>
                  <span className="text-right tabular-nums">
                    {f.sessions}
                    {prev ? <span className="text-ink-soft"> · {Math.round((f.sessions / prev) * 100)}%</span> : null}
                  </span>
                </li>
              );
            })}
          </ol>
          <p className="mt-3 text-small text-ink-soft">Visitors who reached each step. The percentage is from the step before.</p>
        </Card>
        <Card title="New bulk enquiries" action={<Link href="/admin/enquiries" className="text-small text-leaf underline">Pipeline</Link>}>
          {enquiries.length ? (
            <ul className="space-y-3">
              {enquiries.map((e) => (
                <li key={e.id}>
                  <Link href={`/admin/enquiries/${e.id}`} className="block hover:text-leaf">
                    <span className="font-medium">{e.organisation}</span>
                    <span className="block text-small text-ink-soft">
                      {e.quantity} copies · {e.city}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No new enquiries.</Empty>
          )}
        </Card>
      </div>
    </div>
  );
}
