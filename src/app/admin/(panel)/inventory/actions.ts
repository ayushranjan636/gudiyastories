"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { audit, requireAdmin } from "@/server/admin";

const TYPES = ["RESTOCK", "SALE_MARKETPLACE", "SALE_OFFLINE", "RETURN", "DAMAGED", "ADJUSTMENT"] as const;
const OUTGOING = new Set(["SALE_MARKETPLACE", "SALE_OFFLINE", "DAMAGED"]);

const schema = z.object({
  productId: z.string().min(1),
  type: z.enum(TYPES),
  quantity: z.coerce.number().int().refine((n) => n !== 0, "Quantity can't be zero").refine((n) => Math.abs(n) <= 100000),
  channel: z.enum(["AMAZON", "FLIPKART", "OFFLINE", "BULK", "WHATSAPP", "PHONE"]).optional(),
  note: z.string().trim().max(300).optional(),
});

export type MoveResult = { ok: boolean; message: string };

export async function recordMovement(input: z.input<typeof schema>): Promise<MoveResult> {
  const admin = await requireAdmin();
  const p = schema.safeParse(input);
  if (!p.success) return { ok: false, message: p.error.issues[0]?.message ?? "Check the form." };
  const d = p.data;
  const product = await db.product.findUnique({ where: { id: d.productId }, select: { type: true, title: true } });
  if (!product || product.type === "BUNDLE") return { ok: false, message: "Choose a book. Set stock follows its books." };
  // Sales and damage always reduce stock; restocks and returns add. Adjustments keep their sign.
  const qty = OUTGOING.has(d.type) ? -Math.abs(d.quantity) : d.type === "ADJUSTMENT" ? d.quantity : Math.abs(d.quantity);
  const channel = d.type === "SALE_MARKETPLACE" ? (d.channel === "FLIPKART" ? "FLIPKART" : "AMAZON") : d.type === "SALE_OFFLINE" ? (d.channel ?? "OFFLINE") : null;
  const m = await db.stockMovement.create({
    data: { productId: d.productId, type: d.type, quantity: qty, channel, note: d.note || null, adminUserId: admin.id, reason: d.type.replace("_", " ").toLowerCase() },
  });
  await audit(admin, "CREATE", "StockMovement", m.id, undefined, { productId: d.productId, type: d.type, quantity: qty });
  revalidatePath("/admin/inventory");
  revalidatePath("/", "layout");
  return { ok: true, message: `${product.title}: ${qty > 0 ? "+" : ""}${qty} recorded.` };
}

/** CSV with columns sku,count. Creates one adjustment per book so the ledger reaches the counted number. */
export async function importStockCount(form: FormData): Promise<MoveResult> {
  const admin = await requireAdmin();
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) return { ok: false, message: "Choose a CSV file." };
  if (file.size > 200_000) return { ok: false, message: "That file is too large for a stock count." };
  const text = (await file.text()).replace(/^﻿/, "");
  const rows = text.split(/\r?\n/).map((l) => l.split(",").map((c) => c.trim().replace(/^"|"$/g, ""))).filter((r) => r.length >= 2 && r[0]);
  const header = rows[0]!.map((h) => h.toLowerCase());
  const skuCol = header.indexOf("sku");
  const countCol = header.findIndex((h) => h === "count" || h === "on_hand" || h === "available");
  if (skuCol < 0 || countCol < 0) return { ok: false, message: "The first row needs columns named sku and count." };

  const products = await db.product.findMany({ where: { type: { not: "BUNDLE" } }, select: { id: true, sku: true } });
  const bySku = new Map(products.map((p) => [p.sku.toUpperCase(), p.id]));
  const sums = await db.stockMovement.groupBy({ by: ["productId"], _sum: { quantity: true } });
  const onHand = new Map(sums.map((s) => [s.productId, s._sum.quantity ?? 0]));
  let changed = 0;
  const unknown: string[] = [];
  for (const r of rows.slice(1)) {
    const id = bySku.get((r[skuCol] ?? "").toUpperCase());
    const count = Number(r[countCol]);
    if (!id) {
      unknown.push(r[skuCol] ?? "");
      continue;
    }
    if (!Number.isInteger(count) || count < 0) continue;
    const diff = count - (onHand.get(id) ?? 0);
    if (diff === 0) continue;
    await db.stockMovement.create({ data: { productId: id, type: "ADJUSTMENT", quantity: diff, reason: "stock count", note: `Counted ${count}`, adminUserId: admin.id } });
    changed++;
  }
  await audit(admin, "CREATE", "StockCount", "import", undefined, { changed, unknown });
  revalidatePath("/admin/inventory");
  revalidatePath("/", "layout");
  return { ok: true, message: `${changed} ${changed === 1 ? "book" : "books"} adjusted.${unknown.length ? ` Unknown SKUs: ${unknown.join(", ")}.` : ""}` };
}
