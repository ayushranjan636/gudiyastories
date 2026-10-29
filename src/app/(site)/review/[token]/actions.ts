"use server";

import { createHash } from "node:crypto";
import { z } from "zod";
import { hasDatabase } from "@/server/env";

const schema = z.object({
  orderItemId: z.string().min(1),
  rating: z.number().int().min(1, "Pick a rating from 1 to 5").max(5),
  title: z.string().trim().max(100),
  body: z.string().trim().min(10, "Write at least a sentence").max(2000),
  displayName: z.string().trim().min(1, "Add a name to show").max(40),
});

export async function submitReview(token: string, input: z.input<typeof schema>) {
  if (!hasDatabase()) return { ok: false, message: "Reviews are not open yet." };
  const p = schema.safeParse(input);
  if (!p.success) return { ok: false, message: p.error.issues[0]?.message ?? "Check the form." };
  const { db } = await import("@/server/db");
  const order = await db.order.findUnique({ where: { reviewTokenHash: createHash("sha256").update(token).digest("hex") }, include: { items: true } });
  const item = order?.items.find((i) => i.id === p.data.orderItemId);
  if (!order || order.status !== "DELIVERED" || !item?.productId) return { ok: false, message: "This review link isn't valid." };
  const existing = await db.review.findUnique({ where: { orderItemId: item.id } });
  if (existing) return { ok: true, message: "Already reviewed." };
  await db.review.create({
    data: {
      productId: item.productId,
      orderItemId: item.id,
      customerId: order.customerId,
      rating: p.data.rating,
      title: p.data.title || null,
      body: p.data.body,
      displayName: p.data.displayName,
    },
  });
  return { ok: true, message: "Thank you." };
}
