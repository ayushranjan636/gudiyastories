import { requireAdmin } from "@/server/admin";
import { dailySeries, funnel, parseRange, RANGE_OPTIONS, salesBreakdowns, trafficReports } from "@/server/reports";
import { btn, Card, Empty, PageHeader, Table } from "@/components/admin/ui";
import { RangePicker } from "@/components/admin/range-picker";
import { RankBars, TrendChart } from "@/components/admin/charts";
import { formatINR } from "@/lib/money";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await requireAdmin();
  const range = parseRange((await searchParams).range);
  const [series, t, br, fun] = await Promise.all([dailySeries(range), trafficReports(range), salesBreakdowns(range), funnel(range)]);
  const devTotal = t.devices.reduce((n, d) => n + d.views, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics"
        description="Counted on our own server: no cookies, no IP addresses stored, nothing shared with ad networks."
        actions={
          <>
            <RangePicker base="/admin/analytics" active={range.key} options={RANGE_OPTIONS} />
            <a href={`/admin/export/products?range=${range.key}`} className={btn.secondary}>Export products</a>
            <a href={`/admin/export/traffic?range=${range.key}`} className={btn.secondary}>Export pages</a>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Visitors by day"><TrendChart data={series} dataKey="sessions" name="visitors" /></Card>
        <Card title="Orders by day"><TrendChart data={series} dataKey="orders" name="orders" /></Card>
      </div>

      <Card title="How each book is doing">
        {t.productConversion.length ? (
          <Table className="border-0 bg-transparent">
            <thead>
              <tr><th>Book</th><th className="text-right">Page views</th><th className="text-right">Added to bag</th><th className="text-right">Sold</th><th className="text-right">View → sale</th><th className="text-right">Revenue</th><th className="text-right">Margin</th></tr>
            </thead>
            <tbody>
              {t.productConversion.map((p) => (
                <tr key={p.title}>
                  <td className="font-medium">{p.title}</td>
                  <td className="text-right tabular-nums">{p.views}</td>
                  <td className="text-right tabular-nums">{p.addedToBag}</td>
                  <td className="text-right tabular-nums">{p.unitsSold}</td>
                  <td className="text-right tabular-nums">{p.views ? `${((p.unitsSold / p.views) * 100).toFixed(1)}%` : "–"}</td>
                  <td className="text-right tabular-nums">{formatINR(p.revenuePaise)}</td>
                  <td className="text-right tabular-nums text-ink-soft">{p.marginPaise == null ? "add cost" : formatINR(p.marginPaise)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <Empty>No book views or sales in this period.</Empty>
        )}
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="Where visitors come from">
          {t.referrers.length ? <RankBars data={t.referrers.map((r) => ({ name: r.host, visits: r.visits }))} dataKey="visits" name="visits" /> : <Empty>Mostly direct visits so far.</Empty>}
        </Card>
        <Card title="Campaigns (UTM links)">
          {t.campaigns.length ? (
            <ul className="space-y-2 text-small">
              {t.campaigns.map((c, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span>{c.source}{c.medium ? ` / ${c.medium}` : ""}{c.campaign ? <span className="block text-ink-soft">{c.campaign}</span> : null}</span>
                  <span className="tabular-nums">{c.visits}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-small text-ink-soft">Add <code>?utm_source=instagram&amp;utm_campaign=diwali</code> to links you share, and each post will show up here with the sales it brought.</p>
          )}
        </Card>
        <Card title="Devices">
          {devTotal ? (
            <ul className="space-y-3">
              {t.devices.sort((a, b) => b.views - a.views).map((d) => (
                <li key={d.device} className="text-small">
                  <div className="flex justify-between"><span className="capitalize">{d.device}</span><span className="tabular-nums">{Math.round((d.views / devTotal) * 100)}%</span></div>
                  <div className="mt-1 h-2 rounded-full bg-paper-deep"><div className="h-2 rounded-full bg-leaf" style={{ width: `${(d.views / devTotal) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No visits yet.</Empty>
          )}
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="Top pages">
          {t.pages.length ? <RankBars data={t.pages.map((p) => ({ name: p.path, views: p.views }))} dataKey="views" name="views" /> : <Empty>No visits yet.</Empty>}
        </Card>
        <Card title="Orders by state">
          {br.states.length ? <RankBars data={br.states.map((s) => ({ name: s.name, orders: s.orders }))} dataKey="orders" name="orders" /> : <Empty>No orders yet.</Empty>}
        </Card>
        <Card title="Free resource downloads">
          {t.downloads.length ? <RankBars data={t.downloads.map((d) => ({ name: d.title, downloads: d.downloads }))} dataKey="downloads" name="downloads" /> : <Empty>No downloads yet.</Empty>}
        </Card>
      </div>

      <Card title="Funnel">
        <ol className="grid gap-3 sm:grid-cols-5">
          {fun.map((f, i) => (
            <li key={f.step} className="rounded-xl bg-paper p-4">
              <p className="text-small text-ink-soft">{f.step}</p>
              <p className="mt-1 font-display text-h3 tabular-nums">{f.sessions}</p>
              {i ? <p className="text-small text-ink-soft">{fun[i - 1]!.sessions ? `${Math.round((f.sessions / fun[i - 1]!.sessions) * 100)}% of previous` : "–"}</p> : null}
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
