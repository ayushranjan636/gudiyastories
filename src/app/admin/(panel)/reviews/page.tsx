import { db } from "@/server/db";
import { requireAdmin } from "@/server/admin";
import { Badge, Card, Empty, PageHeader, Tabs } from "@/components/admin/ui";
import { formatDate } from "@/lib/format";
import { ReviewControls } from "./review-controls";

export const metadata = { title: "Reviews" };

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const status = ["PENDING", "APPROVED", "HIDDEN"].includes((await searchParams).status ?? "") ? ((await searchParams).status as "PENDING") : "PENDING";
  const reviews = await db.review.findMany({ where: { status }, orderBy: { createdAt: "desc" }, include: { product: { select: { title: true } }, orderItem: { include: { order: { select: { number: true } } } } } });
  return (
    <div className="space-y-6">
      <PageHeader title="Reviews" description="Only customers with a delivered order can review, so every review is a verified purchase. Nothing shows on the site until you approve it." />
      <Tabs active={`/admin/reviews?status=${status}`} items={[{ href: "/admin/reviews?status=PENDING", label: "Waiting" }, { href: "/admin/reviews?status=APPROVED", label: "Approved" }, { href: "/admin/reviews?status=HIDDEN", label: "Hidden" }]} />
      {reviews.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {reviews.map((r) => (
            <Card key={r.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{r.product.title}</p>
                  <p className="text-small text-ink-soft">{r.displayName} · order {r.orderItem.order.number} · {formatDate(r.createdAt)}</p>
                </div>
                <Badge tone={r.rating >= 4 ? "green" : r.rating === 3 ? "amber" : "red"}>{r.rating} / 5</Badge>
              </div>
              {r.title ? <p className="mt-3 font-display text-h4">{r.title}</p> : null}
              <p className="mt-2 text-small whitespace-pre-line">{r.body}</p>
              <ReviewControls id={r.id} status={r.status} reply={r.reply ?? ""} />
            </Card>
          ))}
        </div>
      ) : (
        <Empty>{status === "PENDING" ? "No reviews waiting. Customers get a link to review once their order is marked delivered." : "Nothing here."}</Empty>
      )}
    </div>
  );
}
