import { db } from "@/server/db";
import { requireAdmin } from "@/server/admin";
import { Badge, Empty, PageHeader, Table } from "@/components/admin/ui";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { CouponForm, ToggleCoupon } from "./coupon-form";

export const metadata = { title: "Coupons" };

export default async function CouponsPage() {
  await requireAdmin();
  const [coupons, values] = await Promise.all([
    db.coupon.findMany({ orderBy: { createdAt: "desc" }, include: { restrictedValues: true, redemptions: { select: { discountPaise: true } } } }),
    db.value.findMany({ orderBy: { position: "asc" } }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="Coupons" description="Discount codes for checkout. Usage is counted when an order is confirmed." />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          {coupons.length ? (
            <Table>
              <thead>
                <tr><th>Code</th><th>Discount</th><th>Rules</th><th className="text-right">Used</th><th className="text-right">Given</th><th></th></tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span className="font-mono font-medium">{c.code}</span>
                      {c.description ? <span className="block text-ink-soft">{c.description}</span> : null}
                    </td>
                    <td>{c.type === "PERCENTAGE" ? `${c.amount}%` : formatINR(c.amount)}</td>
                    <td className="text-ink-soft">
                      {[
                        c.minOrderPaise ? `min ${formatINR(c.minOrderPaise)}` : null,
                        c.firstOrderOnly ? "first order" : null,
                        c.restrictedValues.length ? c.restrictedValues.map((v) => v.name).join(", ") : null,
                        c.endsAt ? `until ${formatDate(c.endsAt)}` : null,
                        c.usageLimitTotal ? `${c.usageLimitTotal} uses` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "none"}
                    </td>
                    <td className="text-right tabular-nums">{c.redemptions.length}</td>
                    <td className="text-right tabular-nums">{formatINR(c.redemptions.reduce((n, r) => n + r.discountPaise, 0))}</td>
                    <td className="text-right">
                      <Badge tone={c.active ? "green" : "neutral"}>{c.active ? "on" : "off"}</Badge> <ToggleCoupon id={c.id} active={c.active} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <Empty>No codes yet. Create one on the right.</Empty>
          )}
        </div>
        <CouponForm values={values.map((v) => ({ slug: v.slug, name: v.name }))} />
      </div>
    </div>
  );
}
