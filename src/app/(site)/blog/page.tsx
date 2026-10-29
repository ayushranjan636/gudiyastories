import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedPosts } from "@/features/blog/repo";
import { MediaView } from "@/components/ui/media-view";
import { formatDate } from "@/lib/format";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Blog",
  description: "Short notes by S.V. Bharathi on reading aloud, picture books and the conversations that come after them.",
};
export const revalidate = 60; // scheduled posts appear within a minute; saves refresh instantly

export default async function BlogPage() {
  const posts = await getPublishedPosts();
  const [lead, ...rest] = posts;

  return (
    <div className="content-grid pt-10 md:pt-16">
      <header className="max-w-3xl">
        <p className="label-caps text-ink-soft">Blog</p>
        <h1 className="mt-4 text-hero">Notes from the classroom.</h1>
        <p className="mt-6 max-w-[52ch] text-lead text-ink-soft">
          Short pieces by Bharathi on reading aloud, choosing books by age, and what children say when the story ends.
        </p>
      </header>

      {!lead ? (
        <div className="mt-14 rounded-2xl border border-dashed border-line p-10">
          <p className="font-display text-h3">The first posts are being written.</p>
          <p className="mt-3 max-w-[52ch] text-ink-soft">In the meantime, the free after-the-story cards are a good place to start.</p>
          <ButtonLink href="/resources" variant="secondary" className="mt-6">
            Free resources
          </ButtonLink>
        </div>
      ) : (
        <>
          <article className="mt-14 grid gap-8 border-t border-line pt-10 lg:grid-cols-12">
            {lead.coverImageUrl || lead.coverVideoUrl ? (
              <Link href={`/blog/${lead.slug}`} className="lg:col-span-7">
                <MediaView
                  variant="thumb"
                  url={lead.coverVideoUrl || lead.coverImageUrl!}
                  poster={lead.coverVideoUrl ? lead.coverImageUrl : null}
                  alt={lead.coverImageAlt ?? ""}
                  sizes="(min-width: 1024px) 700px, 100vw"
                  className="aspect-[16/10] w-full rounded-2xl"
                />
              </Link>
            ) : null}
            <div className={lead.coverImageUrl || lead.coverVideoUrl ? "lg:col-span-5" : "lg:col-span-8"}>
              <p className="text-small text-ink-soft">
                {lead.category ? `${lead.category} · ` : ""}
                {lead.publishedAt ? formatDate(lead.publishedAt) : ""} · {lead.readingMinutes} min read
              </p>
              <h2 className="mt-3 text-h2">
                <Link href={`/blog/${lead.slug}`} className="hover:text-leaf">
                  {lead.title}
                </Link>
              </h2>
              <p className="mt-4 text-lead text-ink-soft">{lead.excerpt}</p>
            </div>
          </article>
          <ul className="mt-14 grid gap-10 md:grid-cols-2 lg:grid-cols-3">
            {rest.map((p) => (
              <li key={p.slug} className="border-t border-line pt-5">
                {p.coverImageUrl || p.coverVideoUrl ? (
                  <Link href={`/blog/${p.slug}`} className="mb-4 block" tabIndex={-1} aria-hidden="true">
                    <MediaView
                      variant="thumb"
                      url={p.coverVideoUrl || p.coverImageUrl!}
                      poster={p.coverVideoUrl ? p.coverImageUrl : null}
                      alt=""
                      sizes="(min-width: 1024px) 380px, (min-width: 768px) 50vw, 100vw"
                      className="aspect-[16/10] w-full rounded-xl"
                    />
                  </Link>
                ) : null}
                <p className="text-small text-ink-soft">
                  {p.publishedAt ? formatDate(p.publishedAt) : ""} · {p.readingMinutes} min read
                </p>
                <h3 className="mt-2 text-h4">
                  <Link href={`/blog/${p.slug}`} className="hover:text-leaf">
                    {p.title}
                  </Link>
                </h3>
                <p className="mt-2 text-small text-ink-soft">{p.excerpt}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
