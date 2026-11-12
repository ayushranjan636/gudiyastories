import type { MetadataRoute } from "next";
import { SITE } from "@/config/site";
import { HELP } from "@/content/help";
import { COLLECTIONS } from "@/content/collections";
import { getCatalogue } from "@/features/catalogue/repo";
import { getPublishedPosts } from "@/features/blog/repo";
import { getClasses } from "@/features/classes/repo";
import { absoluteUrl } from "@/lib/seo";

// Rebuilt at most once an hour, so new books, posts and classes show up without a deploy.
export const revalidate = 3600;

/**
 * Every canonical, indexable public page. Left out on purpose: the bag/checkout,
 * order, receipt, review and tracking pages (private, and disallowed in robots.txt),
 * admin, filtered/sorted /books?… URLs (they canonicalise to /books), draft classes,
 * unpublished posts and draft help pages. Bundles live at /sets/…, never /books/….
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE.url.replace(/\/$/, "");
  const [{ products }, posts, classes] = await Promise.all([getCatalogue(), getPublishedPosts(), getClasses()]);
  const latest = (dates: (string | Date | null | undefined)[]) => {
    const ts = dates.map((d) => (d ? new Date(d).getTime() : 0)).filter((t) => t > 0);
    return ts.length ? new Date(Math.max(...ts)) : undefined;
  };
  const catalogueUpdated = latest(products.map((p) => p.updatedAt));
  const page = (path: string, priority: number, lastModified?: Date, images?: string[]): MetadataRoute.Sitemap[number] => ({
    url: `${base}${path}`,
    priority,
    ...(lastModified ? { lastModified } : {}),
    ...(images?.length ? { images: images.map(absoluteUrl) } : {}),
  });

  return [
    page("/", 1, catalogueUpdated, ["/og-home.jpg"]),
    page("/books", 0.9, catalogueUpdated),
    ...products.map((p) =>
      page(
        p.type === "BUNDLE" ? `/sets/${p.slug}` : `/books/${p.slug}`,
        0.8,
        p.updatedAt ? new Date(p.updatedAt) : undefined,
        [p.cover.src, ...p.spreads.slice(0, 3).map((s) => s.src)],
      ),
    ),
    ...COLLECTIONS.map((c) => page(`/books/${c.slug}`, 0.7, catalogueUpdated)),
    page("/classes", 0.7, latest(classes.map((c) => c.updatedAt))),
    ...classes.filter((c) => c.status !== "DRAFT").map((c) => page(`/classes/${c.slug}`, 0.6, c.updatedAt)),
    page("/for-schools", 0.6),
    page("/resources", 0.6),
    page("/gallery", 0.5),
    page("/blog", 0.6, latest(posts.map((p) => p.publishedAt))),
    ...posts.map((p) => page(`/blog/${p.slug}`, 0.5, p.publishedAt ?? undefined, p.coverImageUrl ? [p.coverImageUrl] : undefined)),
    page("/about", 0.5),
    ...Object.entries(HELP)
      .filter(([, h]) => !h.draft)
      .map(([topic]) => page(`/help/${topic}`, 0.3)),
  ];
}
