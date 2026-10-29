"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { audit, requireAdmin } from "@/server/admin";
import { sanitizeHtml } from "@/lib/sanitize";

const img = z.object({
  url: z.string().trim().min(1).max(500),
  alt: z.string().trim().max(300),
  width: z.coerce.number().int().positive().max(10000).nullable().optional(),
  height: z.coerce.number().int().positive().max(10000).nullable().optional(),
});

const schema = z.object({
  title: z.string().trim().min(2, "Title is required").max(160),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug: lowercase letters, numbers and hyphens only"),
  sku: z.string().trim().min(2, "SKU is required").max(40),
  type: z.enum(["STORY", "COLOURING", "BUNDLE"]),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  featured: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(9999),
  shortDescription: z.string().trim().min(10, "Add a short description").max(600),
  longDescriptionHtml: z.string().max(50000).nullable(),
  longDescription: z.unknown().nullable(),
  ageMin: z.coerce.number().int().min(0).max(18).nullable(),
  ageMax: z.coerce.number().int().min(0).max(18).nullable(),
  pages: z.coerce.number().int().min(1).max(2000).nullable(),
  binding: z.string().trim().max(80).nullable(),
  paper: z.string().trim().max(120).nullable(),
  isbn: z
    .string()
    .trim()
    .max(20)
    .nullable()
    .refine((v) => !v || /^97[89]-?\d{1,5}-?\d+-?\d+-?\d$/.test(v), "ISBN looks wrong"),
  publishedOn: z.string().nullable(),
  priceRupees: z.coerce.number().positive("Price is required").max(100000),
  mrpRupees: z.coerce.number().positive("MRP is required").max(100000),
  costRupees: z.coerce.number().min(0).max(100000).nullable(),
  weightGrams: z.coerce.number().int().min(0).max(50000).nullable(),
  hsnCode: z.string().trim().max(12).nullable(),
  amazonUrl: z.union([z.literal(""), z.string().url()]).nullable(),
  flipkartUrl: z.union([z.literal(""), z.string().url()]).nullable(),
  goodFor: z.array(z.string().trim().min(1).max(80)).max(12),
  spineColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable(),
  seoTitle: z.string().trim().max(70).nullable(),
  seoDescription: z.string().trim().max(170).nullable(),
  lowStockThreshold: z.coerce.number().int().min(0).max(10000),
  values: z.array(z.string()).max(6),
  images: z.array(img).max(12),
  spreads: z.array(img).max(40),
  components: z.array(z.object({ productId: z.string(), quantity: z.coerce.number().int().min(1).max(20) })).max(20),
});

export type ProductInput = z.input<typeof schema>;
export type SaveResult = { ok: boolean; message: string; id?: string; fieldErrors?: Record<string, string> };

export async function saveProduct(id: string | null, input: ProductInput): Promise<SaveResult> {
  const admin = await requireAdmin();
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { ok: false, message: "Some fields need attention.", fieldErrors };
  }
  const d = parsed.data;
  const fieldErrors: Record<string, string> = {};
  if (d.mrpRupees < d.priceRupees) fieldErrors.mrpRupees = "MRP can't be lower than the price.";
  if (d.ageMin != null && d.ageMax != null && d.ageMax < d.ageMin) fieldErrors.ageMax = "Upper age is below the lower age.";
  if (d.status === "ACTIVE" && d.images.length === 0 && d.type !== "BUNDLE") fieldErrors.images = "Add at least one image before publishing.";
  if (d.status === "ACTIVE" && [...d.images, ...d.spreads].some((i) => !i.alt)) fieldErrors.images = "Every image needs a description (alt text) before publishing.";
  if (d.type === "BUNDLE" && d.components.length < 2) fieldErrors.components = "A set needs at least two books.";
  if (Object.keys(fieldErrors).length) return { ok: false, message: "Some fields need attention.", fieldErrors };

  const clash = await db.product.findFirst({
    where: { OR: [{ slug: d.slug }, { sku: d.sku }, ...(d.isbn ? [{ isbn: d.isbn }] : [])], NOT: id ? { id } : undefined },
    select: { slug: true, sku: true, isbn: true },
  });
  if (clash) {
    return {
      ok: false,
      message: "Another product already uses that slug, SKU or ISBN.",
      fieldErrors: clash.slug === d.slug ? { slug: "Already used" } : clash.sku === d.sku ? { sku: "Already used" } : { isbn: "Already used" },
    };
  }

  const valueRows = await db.value.findMany({ where: { slug: { in: d.values } }, select: { id: true } });
  const before = id ? await db.product.findUnique({ where: { id } }) : null;
  const data = {
    title: d.title,
    slug: d.slug,
    sku: d.sku,
    type: d.type,
    status: d.status,
    featured: d.featured,
    sortOrder: d.sortOrder,
    shortDescription: d.shortDescription,
    longDescriptionHtml: d.longDescriptionHtml ? sanitizeHtml(d.longDescriptionHtml) : null,
    longDescription: (d.longDescription ?? undefined) as never,
    ageMin: d.ageMin,
    ageMax: d.ageMax,
    pages: d.pages,
    binding: d.binding || null,
    paper: d.paper || null,
    isbn: d.isbn || null,
    publishedOn: d.publishedOn ? new Date(`${d.publishedOn}T00:00:00Z`) : null,
    pricePaise: Math.round(d.priceRupees * 100),
    mrpPaise: Math.round(d.mrpRupees * 100),
    costPaise: d.costRupees != null ? Math.round(d.costRupees * 100) : null,
    weightGrams: d.weightGrams,
    hsnCode: d.hsnCode || null,
    amazonUrl: d.amazonUrl || null,
    flipkartUrl: d.flipkartUrl || null,
    goodFor: d.goodFor,
    spineColor: d.spineColor,
    seoTitle: d.seoTitle || null,
    seoDescription: d.seoDescription || null,
    lowStockThreshold: d.lowStockThreshold,
  };

  const saved = await db.$transaction(async (tx) => {
    const p = id ? await tx.product.update({ where: { id }, data }) : await tx.product.create({ data });
    await tx.productValue.deleteMany({ where: { productId: p.id } });
    if (valueRows.length) await tx.productValue.createMany({ data: valueRows.map((v) => ({ productId: p.id, valueId: v.id })) });
    await tx.productImage.deleteMany({ where: { productId: p.id } });
    if (d.images.length) {
      await tx.productImage.createMany({ data: d.images.map((im, position) => ({ productId: p.id, url: im.url, alt: im.alt, width: im.width ?? null, height: im.height ?? null, position })) });
    }
    await tx.spread.deleteMany({ where: { productId: p.id } });
    if (d.spreads.length) {
      await tx.spread.createMany({ data: d.spreads.map((im, position) => ({ productId: p.id, url: im.url, alt: im.alt, width: im.width ?? null, height: im.height ?? null, position })) });
    }
    if (d.type === "BUNDLE") {
      await tx.bundleItem.deleteMany({ where: { bundleId: p.id } });
      await tx.bundleItem.createMany({ data: d.components.filter((c) => c.productId !== p.id).map((c) => ({ bundleId: p.id, componentId: c.productId, quantity: c.quantity })) });
    }
    return p;
  });

  await audit(admin, id ? "UPDATE" : "CREATE", "Product", saved.id, before ?? undefined, data);
  revalidatePath("/", "layout");
  return { ok: true, message: id ? "Saved. The site is updated." : "Product created.", id: saved.id };
}

export async function setProductsStatus(ids: string[], status: "ACTIVE" | "DRAFT" | "ARCHIVED") {
  const admin = await requireAdmin();
  const safe = z.array(z.string().max(40)).max(200).parse(ids);
  if (status === "ACTIVE") {
    const missing = await db.product.count({ where: { id: { in: safe }, type: { not: "BUNDLE" }, images: { none: {} } } });
    if (missing) return { ok: false, message: `${missing} of those have no image yet, so they can't be published.` };
  }
  const r = await db.product.updateMany({ where: { id: { in: safe } }, data: { status } });
  for (const pid of safe) await audit(admin, "UPDATE", "Product", pid, undefined, { status });
  revalidatePath("/", "layout");
  return { ok: true, message: `${r.count} updated.` };
}
