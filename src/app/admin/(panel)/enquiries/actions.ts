"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { audit, requireAdmin } from "@/server/admin";

export async function updateEnquiry(id: string, input: { stage: string; nextFollowUpOn: string; note: string }) {
  const admin = await requireAdmin();
  const d = z
    .object({
      stage: z.enum(["NEW", "CONTACTED", "SAMPLE_SENT", "QUOTED", "WON", "LOST"]),
      nextFollowUpOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")),
      note: z.string().trim().max(3000),
    })
    .parse(input);
  const before = await db.enquiry.findUnique({ where: { id }, select: { stage: true } });
  await db.enquiry.update({
    where: { id },
    data: {
      stage: d.stage,
      nextFollowUpOn: d.nextFollowUpOn ? new Date(`${d.nextFollowUpOn}T00:00:00Z`) : null,
      ...(d.note ? { notes: { create: { body: d.note, adminUserId: admin.id } } } : {}),
    },
  });
  await audit(admin, "UPDATE", "Enquiry", id, before, { stage: d.stage });
  revalidatePath(`/admin/enquiries/${id}`);
  revalidatePath("/admin/enquiries");
  return { ok: true, message: "Saved." };
}
