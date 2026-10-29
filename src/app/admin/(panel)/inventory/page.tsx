import Link from "next/link";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/admin";
import { stockLevels } from "@/server/reports";
import { Badge, btn, Card, PageHeader, Table } from "@/components/admin/ui";
import { MovementForm, StockImport } from "./movement-form";

export const metadata = { title: "Inventory" };

const LABEL: Record<string, string> = {
  RESTOCK: "Restock",
  SALE_WEBSITE: "Website sale",
  SALE_MARKETPLACE: "Marketplace sale",
  SALE_OFFLINE: "Offline sale",
  RETURN: "Return",
  DAMAGED: "Damaged",
  ADJUSTMENT: "Adjustment",
};
const when = (d: Date) => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(d);

export default async function InventoryPage() {
  await requireAdmin();
  const [stock, ledger] = await Promise.all([
    stockLevels(),
    db.stockMovement.findMany({ orderBy: { createdAt: "desc" }, take: 40, include: { product: { select: { title: true, sku: true } }, adminUser: { select: { name: true } }, order: { select: { id: true, number: true } } } }),
  ]);
  const books = stock.filter((s) => s.type !== "BUNDLE");
  const sets = stock.filter((s) => s.type === "BUNDLE");
  const totalUnits = books.reduce((n, s) => n + s.onHand, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description={`${totalUnits} books on hand. Every change is a line in the ledger below, so the numbers always add up.`}
        actions={<a download href="/admin/export/stock" className={btn.secondary}>Export CSV</a>}
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Table>
            <thead>
              <tr>
                <th>Book</th>
                <th className="text-right">On hand</th>
                <th className="text-right">Reserved</th>
                <th className="text-right">Available</th>
                <th className="text-right">Alert at</th>
                <th>Last change</th>
              </tr>
            </thead>
            <tbody>
              {books.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link href={`/admin/products/${s.id}`} className="font-medium hover:text-leaf">{s.title}</Link>
                    <span className="block text-ink-soft">{s.sku}</span>
                  </td>
                  <td className="text-right tabular-nums">{s.onHand}</td>
                  <td className="text-right text-ink-soft tabular-nums">{s.reserved || "–"}</td>
                  <td className="text-right"><Badge tone={s.available === 0 ? "red" : s.low ? "amber" : "green"}>{s.available}</Badge></td>
                  <td className="text-right text-ink-soft tabular-nums">{s.threshold}</td>
                  <td className="text-ink-soft">{s.lastMovementAt ? when(s.lastMovementAt) : "–"}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Card title="Sets (worked out from their books)">
            <ul className="grid gap-2 sm:grid-cols-2">
              {sets.map((s) => (
                <li key={s.id} className="flex items-center justify-between rounded-lg bg-paper px-3 py-2 text-small">
                  {s.title}
                  <Badge tone={s.onHand === 0 ? "red" : "neutral"}>{s.onHand} possible</Badge>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <div className="space-y-6">
          <MovementForm books={books.map((b) => ({ id: b.id, title: b.title, available: b.available }))} />
          <StockImport />
        </div>
      </div>

      <Card title="Ledger">
        <Table className="border-0 bg-transparent">
          <thead>
            <tr>
              <th>When</th>
              <th>Book</th>
              <th>Type</th>
              <th className="text-right">Change</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {ledger.map((m) => (
              <tr key={m.id}>
                <td className="whitespace-nowrap text-ink-soft">{when(m.createdAt)}</td>
                <td>{m.product.title}</td>
                <td>{LABEL[m.type]}{m.channel ? <span className="text-ink-soft"> · {m.channel.toLowerCase()}</span> : null}</td>
                <td className={`text-right font-medium tabular-nums ${m.quantity > 0 ? "text-leaf" : "text-clay"}`}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</td>
                <td className="text-ink-soft">
                  {m.order ? <Link href={`/admin/orders/${m.order.id}`} className="underline">{m.order.number}</Link> : null}
                  {m.note ? ` ${m.note}` : ""}
                  {m.adminUser ? ` · ${m.adminUser.name}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
