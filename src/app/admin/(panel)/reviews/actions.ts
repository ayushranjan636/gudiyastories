"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { audit, requireAdmin } from "@/server/admin";

export async function moderateReview(id: string, status: "APPROVED" | "HIDDEN" | "PENDING", reply: string) {
  const admin = await requireAdmin();
  const d = z.object({ status: z.enum(["APPROVED", "HIDDEN", "PENDING"]), reply: z.string().trim().max(1000) }).parse({ status, reply });
  const r = await db.review.update({
    where: { id },
    data: { status: d.status, reply: d.reply || null, repliedAt: d.reply ? new Date() : null },
    include: { product: { select: { slug: true } } },
  });
  await audit(admin, "UPDATE", "Review", id, undefined, d);
  revalidatePath("/admin/reviews");
  revalidatePath(`/books/${r.product.slug}`);
}
