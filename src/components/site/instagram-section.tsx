import Image from "next/image";
import { ArrowUpRight, Camera } from "lucide-react";
import { SITE } from "@/config/site";
import { getSetting } from "@/server/settings";
import { MOMENTS, READER_ART } from "@/content/gallery";
import { HideWhileBuying, InstagramEmbeds } from "./instagram-embeds";

/** Keeps only real post or reel links, e.g. https://www.instagram.com/p/ABC123/ */
export function cleanInstagramPosts(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const out: string[] = [];
  for (const raw of list) {
    const m = String(raw).trim().match(/^https?:\/\/(?:www\.)?instagram\.com\/(?:[A-Za-z0-9_.]+\/)?(p|reel|tv)\/([A-Za-z0-9_-]+)/);
    if (m) out.push(`https://www.instagram.com/${m[1]}/${m[2]}/`);
  }
  return [...new Set(out)].slice(0, 6);
}

/** Just above the footer: chosen Instagram posts, or a follow card until some are picked in Admin → Settings. */
export async function InstagramSection() {
  const social = await getSetting<{ instagram: string | null; instagramPosts: string[] }>("social");
  const profile = social.instagram || SITE.instagram;
  if (!profile) return null;
  const posts = cleanInstagramPosts(social.instagramPosts).slice(0, 3);
  const handle = `@${SITE.instagramHandle}`;

  return (
    <HideWhileBuying>
      <section aria-labelledby="ig-title" className="content-grid mt-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label-caps flex items-center gap-2 text-ink-soft">
              <Camera className="size-4" strokeWidth={1.5} aria-hidden="true" /> On Instagram
            </p>
            <h2 id="ig-title" className="mt-3 text-h2">
              Follow along at <span className="whitespace-nowrap">{handle}</span>
            </h2>
          </div>
          <a
            href={profile}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-leaf underline decoration-lime decoration-2 underline-offset-[6px]"
          >
            Open Instagram <ArrowUpRight className="size-4" strokeWidth={1.5} aria-hidden="true" />
          </a>
        </div>

        {posts.length ? (
          <div className="mt-10">
            <InstagramEmbeds posts={posts} />
          </div>
        ) : (
          <a
            href={profile}
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-10 grid overflow-hidden rounded-2xl border border-line bg-white/60 md:grid-cols-12"
          >
            <div className="flex flex-col justify-center gap-4 p-8 md:col-span-5 md:p-10">
              <p className="text-lead">New books, readings in classrooms, events, and pages coloured by readers.</p>
              <p className="text-small text-ink-soft">Coloured one of our pages? Tag {handle} and it may be the next one on our wall.</p>
              <span className="mt-2 inline-flex w-fit items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-small font-medium text-paper transition-colors group-hover:bg-leaf">
                Follow {handle}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1 md:col-span-7">
              {[
                { src: READER_ART.src, alt: READER_ART.alt, pos: "50% 35%" },
                { src: MOMENTS[0]!.src, alt: MOMENTS[0]!.alt, pos: "55% 40%" },
                { src: "/books/winter-wonderland.webp", alt: "Cover of the picture book Winter Wonderland", pos: "50% 50%" },
              ].map((t) => (
                <div key={t.src} className="relative aspect-[4/5] overflow-hidden md:aspect-auto md:min-h-72">
                  <Image
                    src={t.src}
                    alt={t.alt}
                    fill
                    sizes="(min-width: 768px) 20vw, 33vw"
                    style={{ objectPosition: t.pos }}
                    className="object-cover transition-transform duration-700 ease-page group-hover:scale-[1.04]"
                  />
                </div>
              ))}
            </div>
          </a>
        )}
      </section>
    </HideWhileBuying>
  );
}
