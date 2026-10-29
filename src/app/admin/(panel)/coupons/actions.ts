"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { audit, requireAdmin } from "@/server/admin";

const schema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,24}$/, "3 to 24 letters, numbers or hyphens"),
  description: z.string().trim().max(120).optional(),
  type: z.enum(["PERCENTAGE", "FIXED"]),
  amount: z.coerce.number().positive(),
  minOrderRupees: z.coerce.number().min(0).optional(),
  endsAt: z.string().optional(),
  usageLimitTotal: z.coerce.number().int().min(1).optional(),
  usageLimitPerCustomer: z.coerce.number().int().min(1).optional(),
  firstOrderOnly: z.boolean(),
  values: z.array(z.string()).max(6),
});

export async function createCoupon(input: z.input<typeof schema>) {
  const admin = await requireAdmin();
  const p = schema.safeParse(input);
  if (!p.success) return { ok: false, message: p.error.issues[0]?.message ?? "Check the form." };
  const d = p.data;
  if (d.type === "PERCENTAGE" && d.amount > 90) return { ok: false, message: "Percentage codes are capped at 90%." };
  if (await db.coupon.findUnique({ where: { code: d.code } })) return { ok: false, message: "That code already exists." };
  const c = await db.coupon.create({
    data: {
      code: d.code,
      description: d.description || null,
      type: d.type,
      amount: d.type === "FIXED" ? Math.round(d.amount * 100) : Math.round(d.amount),
      minOrderPaise: d.minOrderRupees ? Math.round(d.minOrderRupees * 100) : null,
      endsAt: d.endsAt ? new Date(`${d.endsAt}T23:59:59+05:30`) : null,
      usageLimitTotal: d.usageLimitTotal ?? null,
      usageLimitPerCustomer: d.usageLimitPerCustomer ?? null,
      firstOrderOnly: d.firstOrderOnly,
      restrictedValues: { connect: d.values.map((slug) => ({ slug })) },
    },
  });
  await audit(admin, "CREATE", "Coupon", c.id, undefined, d);
  revalidatePath("/admin/coupons");
  return { ok: true, message: `${d.code} created.` };
}

export async function toggleCoupon(id: string, active: boolean) {
  const admin = await requireAdmin();
  await db.coupon.update({ where: { id }, data: { active } });
  await audit(admin, "UPDATE", "Coupon", id, undefined, { active });
  revalidatePath("/admin/coupons");
}
