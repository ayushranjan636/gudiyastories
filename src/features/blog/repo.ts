import "server-only";
import { cache } from "react";
import { hasDatabase } from "@/server/env";

export type PostSummary = {
  slug: string;
  title: string;
  excerpt: string;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  coverVideoUrl: string | null;
  publishedAt: Date | null;
  readingMinutes: number;
  category: string | null;
};

const liveWhere = () => ({
  OR: [
    { status: "PUBLISHED" as const, publishedAt: { lte: new Date() } },
    { status: "SCHEDULED" as const, publishAt: { lte: new Date() } },
  ],
});

export const getPublishedPosts = cache(async (): Promise<PostSummary[]> => {
  if (!hasDatabase()) return [];
  try {
    const { db } = await import("@/server/db");
    const posts = await db.post.findMany({
      where: liveWhere(),
      orderBy: [{ publishedAt: "desc" }, { publishAt: "desc" }],
      include: { category: true },
      take: 50,
    });
    return posts.map((p) => ({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      coverImageUrl: p.coverImageUrl,
      coverImageAlt: p.coverImageAlt,
      coverVideoUrl: p.coverVideoUrl,
      publishedAt: p.publishedAt ?? p.publishAt,
      readingMinutes: p.readingMinutes,
      category: p.category?.name ?? null,
    }));
  } catch (err) {
    console.error("[blog] database unavailable", err);
    return [];
  }
});

export async function getPost(slug: string, previewToken?: string) {
  if (!hasDatabase()) return null;
  const { db } = await import("@/server/db");
  const post = await db.post.findUnique({
    where: { slug },
    include: { category: true, relatedProducts: { select: { slug: true } } },
  });
  if (!post) return null;
  const now = new Date();
  const live =
    (post.status === "PUBLISHED" && (!post.publishedAt || post.publishedAt <= now)) ||
    (post.status === "SCHEDULED" && post.publishAt && post.publishAt <= now);
  if (!live && post.previewToken !== previewToken) return null;
  return { ...post, isPreview: !live };
}
