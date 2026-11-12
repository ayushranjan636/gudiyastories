import type { Metadata } from "next";
import { SITE } from "@/config/site";

/** The default share image (1200×630) for pages without one of their own. */
export const DEFAULT_OG_IMAGE = { url: "/og-home.jpg", width: 1200, height: 630, alt: "Gudiya Stories picture books and colouring books" };

type OgImage = { url: string; width?: number; height?: number; alt?: string };

/**
 * Complete metadata for one indexable page: title, description, canonical URL,
 * Open Graph and Twitter card. Next.js replaces (not merges) a parent's openGraph
 * when a page sets one, so every field is set here, every time.
 *
 * `title` gets the " · Gudiya Stories" suffix from the root layout unless `absolute`.
 */
export function pageMetadata({
  title,
  absolute = false,
  description,
  path,
  image,
  type = "website",
  noindex = false,
  publishedTime,
  modifiedTime,
}: {
  title: string;
  absolute?: boolean;
  description: string;
  /** Canonical path, e.g. "/books/spread-love" (no query string). */
  path: string;
  image?: OgImage | null;
  type?: "website" | "article";
  noindex?: boolean;
  publishedTime?: string;
  modifiedTime?: string;
}): Metadata {
  const fullTitle = absolute ? title : `${title} · ${SITE.name}`;
  const img = image ?? DEFAULT_OG_IMAGE;
  return {
    title: absolute ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title: fullTitle,
      description,
      url: path,
      siteName: SITE.name,
      locale: "en_IN",
      type,
      images: [img],
      ...(type === "article" && publishedTime ? { publishedTime } : {}),
      ...(type === "article" && modifiedTime ? { modifiedTime } : {}),
    },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [img.url] },
  };
}

/** Uploaded images may already be full URLs (S3); files in /public are site paths. */
export function absoluteUrl(src: string) {
  return /^https?:\/\//.test(src) ? src : `${SITE.url.replace(/\/$/, "")}${src.startsWith("/") ? "" : "/"}${src}`;
}

/** Trims a description to about 155 characters on a word boundary, for search snippets. */
export function snippet(text: string, max = 158) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}
