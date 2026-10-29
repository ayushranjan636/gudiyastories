import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/admin";
import { hasStorage } from "@/server/storage";
import { NoteEditor } from "./post-editor";

export const metadata = { title: "Edit post" };

export default async function EditPost({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const isNew = id === "new";
  const [post, products, categories] = await Promise.all([
    isNew
      ? null
      : db.post.findUnique({
          where: { id },
          include: { category: true, tags: true, relatedProducts: { select: { id: true } }, revisions: { orderBy: { createdAt: "desc" }, take: 10, include: { adminUser: { select: { name: true } } } } },
        }),
    db.product.findMany({ where: { status: "ACTIVE" }, orderBy: { sortOrder: "asc" }, select: { id: true, slug: true, title: true } }),
    db.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!isNew && !post) notFound();
  const toLocal = (d: Date | null | undefined) => (d ? new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 16) : "");

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/blog" className="text-small text-ink-soft hover:text-ink">← Blog</Link>
        <h1 className="mt-2 text-h3">{isNew ? "New post" : post!.title}</h1>
      </div>
      <NoteEditor
        id={isNew ? null : id}
        canDelete={admin.role === "OWNER"}
        canUpload={hasStorage()}
        products={products}
        categories={categories.map((c) => c.name)}
        previewUrl={post ? `/blog/${post.slug}?preview=${post.previewToken}` : null}
        revisions={(post?.revisions ?? []).map((r) => ({ id: r.id, at: r.createdAt.toISOString(), by: r.adminUser?.name ?? "" }))}
        initial={{
          title: post?.title ?? "",
          slug: post?.slug ?? "",
          excerpt: post?.excerpt ?? "",
          contentHtml: post?.contentHtml ?? "",
          coverImageUrl: post?.coverImageUrl ?? "",
          coverImageAlt: post?.coverImageAlt ?? "",
          coverVideoUrl: post?.coverVideoUrl ?? "",
          status: post?.status ?? "DRAFT",
          publishAt: toLocal(post?.publishAt),
          category: post?.category?.name ?? "",
          tags: post?.tags.map((t) => t.name) ?? [],
          relatedProductIds: post?.relatedProducts.map((p) => p.id) ?? [],
          seoTitle: post?.seoTitle ?? "",
          seoDescription: post?.seoDescription ?? "",
        }}
      />
    </div>
  );
}
