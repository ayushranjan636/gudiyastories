"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { audit, requireAdmin } from "@/server/admin";

const schema = z.object({
  orderId: z.string().min(5).max(40),
  status: z.enum(["NEW", "CONTACTED", "CONVERTED", "LOST"]),
  note: z.string().trim().max(1000).optional(),
});

/** Records the follow-up on an abandoned checkout (status and a short note). */
export async function updateLead(input: z.input<typeof schema>) {
  const admin = await requireAdmin();
  const d = schema.safeParse(input);
  if (!d.success) return { ok: false, message: "Check the note." };
  const o = await db.order.findUnique({ where: { id: d.data.orderId }, select: { status: true, contactPhone: true } });
  if (!o || !["PENDING_PAYMENT", "EXPIRED"].includes(o.status)) return { ok: false, message: "That checkout is no longer an open lead." };
  // The same person's earlier unpaid attempts get the same status (one lead per person).
  await db.order.updateMany({
    where: { contactPhone: o.contactPhone, status: { in: ["PENDING_PAYMENT", "EXPIRED"] }, id: { not: d.data.orderId } },
    data: { leadStatus: d.data.status, leadUpdatedAt: new Date() },
  });
  await db.order.update({
    where: { id: d.data.orderId },
    data: {
      leadStatus: d.data.status,
      leadUpdatedAt: new Date(),
      ...(d.data.note !== undefined ? { leadNote: d.data.note || null } : {}),
      events: { create: { message: `Lead marked ${d.data.status.toLowerCase()}${d.data.note ? `: ${d.data.note}` : ""}`, adminUserId: admin.id } },
    },
  });
  await audit(admin, "UPDATE", "Order", d.data.orderId, undefined, { leadStatus: d.data.status });
  revalidatePath("/admin/leads");
  return { ok: true, message: "Saved." };
}
