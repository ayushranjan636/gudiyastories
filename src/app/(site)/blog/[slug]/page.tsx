import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost } from "@/features/blog/repo";
import { MediaView } from "@/components/ui/media-view";
import { getCatalogue } from "@/features/catalogue/repo";
import { formatDate } from "@/lib/format";
import { formatINR } from "@/lib/money";
import { JsonLd } from "@/components/site/json-ld";
import { SITE } from "@/config/site";
import { faqFromHtml, sanitizeHtml, withVideoStills } from "@/lib/sanitize";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

/** Book cards inserted in the editor are saved as <div data-product="slug">; render them as real cards. */
function expandBookCards(html: string, products: Awaited<ReturnType<typeof getCatalogue>>["products"]) {
  return html.replace(/<div data-product="([a-z0-9-]+)"[^>]*>[\s\S]*?<\/div>/g, (_m, slug: string) => {
    const p = products.find((x) => x.slug === slug);
    if (!p) return "";
    const href = p.type === "BUNDLE" ? `/sets/${p.slug}` : `/books/${p.slug}`;
    return `<a class="book-embed" href="${href}"><img src="${esc(p.cover.src)}" alt="" width="${p.cover.width}" height="${p.cover.height}" loading="lazy" /><span><strong>${esc(p.title)}</strong><span>${esc(p.shortDescription)}</span><em>${formatINR(p.pricePaise)} · See the book</em></span></a>`;
  });
}

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ preview?: string }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const post = await getPost((await params).slug, (await searchParams).preview);
  if (!post) return {};
  return {
    title: post.seoTitle ?? post.title,
    description: post.seoDescription ?? post.excerpt,
    robots: post.isPreview ? { index: false } : undefined,
    openGraph: { type: "article", images: post.ogImageUrl ?? post.coverImageUrl ?? undefined },
  };
}

export default async function BlogPostPage({ params, searchParams }: Props) {
  const [{ slug }, { preview }] = await Promise.all([params, searchParams]);
  const post = await getPost(slug, preview);
  if (!post) notFound();
  const { products } = await getCatalogue();
  const related = products.filter((p) => post.relatedProducts.some((r) => r.slug === p.slug));
  const date = post.publishedAt ?? post.publishAt;
  const faq = faqFromHtml(post.contentHtml);

  return (
    <article className="pt-10 md:pt-16">
      {post.isPreview ? (
        <p className="content-grid mb-6">
          <span className="rounded-full bg-clay/10 px-3 py-1 text-small font-medium text-clay">Preview. Not published yet.</span>
        </p>
      ) : null}
      <header className="content-grid max-w-3xl">
        <p className="text-small text-ink-soft">
          <Link href="/blog" className="hover:text-ink">
            Blog
          </Link>
          {post.category ? ` · ${post.category.name}` : ""} · {post.readingMinutes} min read
        </p>
        <h1 className="mt-4 text-h2">{post.title}</h1>
        <p className="mt-4 text-lead text-ink-soft">{post.excerpt}</p>
        <p className="mt-6 text-small">
          By {SITE.author}
          {date ? <span className="text-ink-soft"> · {formatDate(date)}</span> : null}
        </p>
      </header>
      {post.coverVideoUrl || post.coverImageUrl ? (
        <div className="content-grid mt-10">
          <MediaView
            url={post.coverVideoUrl || post.coverImageUrl!}
            poster={post.coverVideoUrl ? post.coverImageUrl : null}
            alt={post.coverImageAlt ?? ""}
            sizes="(min-width: 1280px) 1200px, 100vw"
            priority
            className="aspect-[16/9] w-full rounded-2xl"
          />
        </div>
      ) : null}
      <div className="content-grid mt-10 max-w-3xl">
        <div className="prose-notes" dangerouslySetInnerHTML={{ __html: withVideoStills(expandBookCards(sanitizeHtml(post.contentHtml), products)) }} />

        <aside className="mt-14 flex items-center gap-5 rounded-2xl bg-paper-deep p-6">
          <Image src="/authors/sv-bharathi.jpg" alt="" width={600} height={800} className="size-16 rounded-full object-cover grayscale" />
          <p className="text-small">
            <span className="font-medium">{SITE.author}</span> has taught in early-years classrooms for more than fifteen years. She writes
            and designs every Gudiya Stories book.
          </p>
        </aside>

        {related.length ? (
          <section className="mt-14" aria-labelledby="rel-title">
            <h2 id="rel-title" className="text-h4">
              Books from this post
            </h2>
            <ul className="mt-5 grid gap-4 sm:grid-cols-2">
              {related.map((p) => (
                <li key={p.slug}>
                  <Link href={p.type === "BUNDLE" ? `/sets/${p.slug}` : `/books/${p.slug}`} className="flex items-center gap-4 rounded-2xl border border-line p-4 hover:border-ink/30">
                    <Image src={p.cover.src} alt="" width={p.cover.width} height={p.cover.height} className="w-14 rounded-[2px]" />
                    <span>
                      <span className="block font-display">{p.title}</span>
                      <span className="text-small text-ink-soft">{formatINR(p.pricePaise)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.excerpt,
          datePublished: date?.toISOString(),
          dateModified: post.updatedAt.toISOString(),
          author: { "@type": "Person", name: SITE.author },
          publisher: { "@type": "Organization", name: SITE.name },
          image: post.coverImageUrl ?? undefined,
          mainEntityOfPage: `${SITE.url}/blog/${post.slug}`,
        }}
      />
      {faq.length ? (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          }}
        />
      ) : null}
    </article>
  );
}
