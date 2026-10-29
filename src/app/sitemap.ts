import type { MetadataRoute } from "next";
import { SITE } from "@/config/site";
import { HELP } from "@/content/help";
import { getCatalogue } from "@/features/catalogue/repo";
import { getPublishedPosts } from "@/features/blog/repo";
import { getClasses } from "@/features/classes/repo";

// Rebuilt at most once an hour, so new books, posts and classes show up without a deploy.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE.url.replace(/\/$/, "");
  const [{ products }, posts, classes] = await Promise.all([getCatalogue(), getPublishedPosts(), getClasses()]);
  const page = (path: string, priority = 0.5, lastModified?: Date | null): MetadataRoute.Sitemap[number] => ({
    url: `${base}${path}`,
    priority,
    ...(lastModified ? { lastModified } : {}),
  });
  return [
    page("/", 1),
    page("/books", 0.9),
    page("/classes", 0.8),
    page("/for-schools", 0.7),
    page("/resources", 0.6),
    page("/blog", 0.6),
    page("/about", 0.5),
    ...products.map((p) => page(p.type === "BUNDLE" ? `/sets/${p.slug}` : `/books/${p.slug}`, 0.8)),
    ...classes.map((c) => page(`/classes/${c.slug}`, 0.7)),
    ...posts.map((p) => page(`/blog/${p.slug}`, 0.5, p.publishedAt)),
    ...Object.keys(HELP).map((topic) => page(`/help/${topic}`, 0.3)),
  ];
}
