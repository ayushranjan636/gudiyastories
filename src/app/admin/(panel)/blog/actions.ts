"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { audit, requireAdmin } from "@/server/admin";
import { sanitizeHtml } from "@/lib/sanitize";

const schema = z.object({
  title: z.string().trim().min(3, "Add a title").max(160),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and hyphens only"),
  excerpt: z.string().trim().min(10, "Add a one or two sentence summary").max(300),
  contentHtml: z.string().max(200000),
  content: z.unknown().optional(),
  text: z.string().max(200000),
  coverImageUrl: z.string().trim().max(500).optional(),
  coverImageAlt: z.string().trim().max(300).optional(),
  coverVideoUrl: z.string().trim().max(500).optional(),
  status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED"]),
  publishAt: z.string().optional(),
  category: z.string().trim().max(60).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(12),
  relatedProductIds: z.array(z.string()).max(8),
  seoTitle: z.string().trim().max(70).optional(),
  seoDescription: z.string().trim().max(170).optional(),
});

export type NoteInput = z.input<typeof schema>;
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function savePost(id: string | null, input: NoteInput) {
  const admin = await requireAdmin();
  const p = schema.safeParse(input);
  if (!p.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of p.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    const LABEL: Record<string, string> = { title: "Title", slug: "Address", excerpt: "Summary", seoTitle: "SEO title", seoDescription: "SEO description", coverImageUrl: "Cover image", coverImageAlt: "Image description", tags: "Tags", category: "Category" };
    const which = Object.entries(fieldErrors).map(([k, m]) => `${LABEL[k] ?? k}: ${m}`).join(" · ");
    return { ok: false as const, message: `Some fields need attention. ${which}`, fieldErrors };
  }
  const d = p.data;
  if ((d.coverImageUrl || d.coverVideoUrl) && !d.coverImageAlt) return { ok: false as const, message: "Describe the cover in a sentence.", fieldErrors: { coverImageAlt: "Required with a cover" } };
  if (d.status === "SCHEDULED" && !d.publishAt) return { ok: false as const, message: "Pick a date and time to publish.", fieldErrors: { publishAt: "Required" } };
  if (/\[DRAFT/i.test(d.title) && d.status !== "DRAFT") return { ok: false as const, message: "Replace the draft title before publishing.", fieldErrors: { title: "Still a placeholder" } };
  const clash = await db.post.findFirst({ where: { slug: d.slug, NOT: id ? { id } : undefined }, select: { id: true } });
  if (clash) return { ok: false as const, message: "Another post uses that address.", fieldErrors: { slug: "Already used" } };

  const words = d.text.trim().split(/\s+/).filter(Boolean).length;
  const category = d.category
    ? await db.category.upsert({ where: { slug: slugify(d.category) }, create: { slug: slugify(d.category), name: d.category }, update: {} })
    : null;
  const tags = await Promise.all(d.tags.map((t) => db.tag.upsert({ where: { slug: slugify(t) }, create: { slug: slugify(t), name: t }, update: {} })));
  const existing = id ? await db.post.findUnique({ where: { id } }) : null;
  const html = sanitizeHtml(d.contentHtml);
  const publishAt = d.status === "SCHEDULED" && d.publishAt ? new Date(d.publishAt) : null;

  const data = {
    title: d.title,
    slug: d.slug,
    excerpt: d.excerpt,
    content: (d.content ?? existing?.content ?? {}) as never,
    contentHtml: html,
    coverImageUrl: d.coverImageUrl || null,
    coverImageAlt: d.coverImageAlt || null,
    coverVideoUrl: d.coverVideoUrl || null,
    status: d.status,
    publishAt,
    publishedAt: d.status === "PUBLISHED" ? (existing?.publishedAt ?? new Date()) : d.status === "SCHEDULED" ? publishAt : null,
    readingMinutes: Math.max(1, Math.round(words / 200)),
    seoTitle: d.seoTitle || null,
    seoDescription: d.seoDescription || null,
    categoryId: category?.id ?? null,
    authorId: existing?.authorId ?? admin.id,
    tags: { set: tags.map((t) => ({ id: t.id })) },
    relatedProducts: { set: d.relatedProductIds.map((pid) => ({ id: pid })) },
  };

  const post = id ? await db.post.update({ where: { id }, data }) : await db.post.create({ data: { ...data, tags: { connect: tags.map((t) => ({ id: t.id })) }, relatedProducts: { connect: d.relatedProductIds.map((pid) => ({ id: pid })) } } });

  // Keep the last 10 versions.
  await db.postRevision.create({ data: { postId: post.id, title: d.title, excerpt: d.excerpt, content: (d.content ?? existing?.content ?? {}) as never, contentHtml: html, adminUserId: admin.id } });
  const old = await db.postRevision.findMany({ where: { postId: post.id }, orderBy: { createdAt: "desc" }, skip: 10, select: { id: true } });
  if (old.length) await db.postRevision.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });

  await audit(admin, id ? "UPDATE" : "CREATE", "Post", post.id, existing ? { status: existing.status, title: existing.title } : undefined, { status: d.status, title: d.title });
  revalidatePath("/blog");
  revalidatePath(`/blog/${post.slug}`);
  if (existing && existing.slug !== post.slug) revalidatePath(`/blog/${existing.slug}`);
  revalidatePath("/");
  return { ok: true as const, message: d.status === "PUBLISHED" ? "Published." : d.status === "SCHEDULED" ? "Scheduled." : "Draft saved.", id: post.id };
}

export async function restoreRevision(postId: string, revisionId: string) {
  const admin = await requireAdmin();
  const r = await db.postRevision.findFirst({ where: { id: revisionId, postId } });
  if (!r) return { ok: false, message: "Version not found." };
  await db.post.update({ where: { id: postId }, data: { title: r.title, excerpt: r.excerpt, content: r.content as never, contentHtml: r.contentHtml } });
  await audit(admin, "UPDATE", "Post", postId, undefined, { restoredRevision: revisionId });
  revalidatePath(`/admin/blog/${postId}`);
  return { ok: true, message: "Restored. Check it, then save to publish." };
}

export async function deletePost(id: string) {
  const admin = await requireAdmin("OWNER");
  const p = await db.post.delete({ where: { id } });
  await audit(admin, "DELETE", "Post", id, { title: p.title }, undefined);
  revalidatePath("/blog");
  revalidatePath(`/blog/${p.slug}`);
  revalidatePath("/");
  return { ok: true, message: "Deleted." };
}
