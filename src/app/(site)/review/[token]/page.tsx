import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createHash } from "node:crypto";
import { hasDatabase } from "@/server/env";
import { ReviewForm } from "./review-form";

export const metadata: Metadata = { title: "Review your books", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ReviewPage({ params }: { params: Promise<{ token: string }> }) {
  if (!hasDatabase()) notFound();
  const { token } = await params;
  const { db } = await import("@/server/db");
  const order = await db.order.findUnique({
    where: { reviewTokenHash: createHash("sha256").update(token).digest("hex") },
    include: { items: { where: { productId: { not: null } }, include: { review: true } } },
  });
  if (!order || order.status !== "DELIVERED") notFound();
  const open = order.items.filter((i) => !i.review);

  return (
    <div className="content-grid max-w-3xl pt-10 md:pt-16">
      <p className="label-caps text-ink-soft">Order {order.number}</p>
      <h1 className="mt-3 text-h2">What did you make of them?</h1>
      <p className="mt-3 text-lead text-ink-soft">A few honest lines help other parents choose.</p>
      {open.length ? (
        <div className="mt-10">
          <ReviewForm token={token} items={open.map((i) => ({ id: i.id, title: i.title }))} firstName={order.contactName.split(" ")[0] ?? ""} />
        </div>
      ) : (
        <p className="mt-10 font-display text-h3">Thank you. You&apos;ve reviewed everything in this order.</p>
      )}
    </div>
  );
}
