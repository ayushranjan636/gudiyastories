import Image from "next/image";
import Link from "next/link";
import { HOME_COLOURED, HOME_VIDEOS, READER_CLIPS } from "@/content/gallery";
import { LazyVideo } from "@/components/ui/lazy-video";
import { Lightbox } from "@/components/ui/lightbox";
import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/cn";

const TILT = ["rotate-[-1.5deg]", "rotate-[1deg]", "rotate-[-0.5deg]", "rotate-[1.6deg]", "rotate-[-1deg]", "rotate-[0.6deg]"];

/**
 * The books in real children's hands: a strip of short silent loops (one per
 * storybook, each linking to its book), then the longer videos to play with sound.
 * Everything here loads only as it scrolls into view.
 */
export function ReadersReel({ books }: { books: { slug: string; title: string }[] }) {
  const reel = books.filter((b) => READER_CLIPS[b.slug]);
  return (
    <section aria-labelledby="readers-title" className="overflow-x-clip py-16 md:py-24">
      <div className="content-grid">
        <Reveal className="max-w-3xl">
          <p className="label-caps text-ink-soft">Real books, real readers</p>
          <h2 id="readers-title" className="mt-3 text-h2">
            This is what the books look like at home.
          </h2>
          <p className="mt-4 max-w-[54ch] text-ink-soft">Families send us photos and videos of the books with their children. Tap one to open the book.</p>
        </Reveal>
      </div>

      <ul className="content-grid mt-10 grid snap-x snap-mandatory auto-cols-[62%] grid-flow-col gap-5 overflow-x-auto pb-6 sm:auto-cols-[38%] md:auto-cols-auto md:grid-flow-row md:grid-cols-3 md:overflow-visible lg:grid-cols-6">
        {reel.map((b, i) => (
          <Reveal as="li" key={b.slug} delay={Math.min(i, 5) * 0.06} className="snap-center">
            <Link
              href={`/books/${b.slug}`}
              className={cn(
                "group block bg-white p-2 pb-3 shadow-[0_22px_34px_-24px_rgb(27_26_23/0.55)] transition-transform duration-500 ease-page hover:-translate-y-1 hover:rotate-0",
                TILT[i % TILT.length],
              )}
            >
              <LazyVideo ambient src={READER_CLIPS[b.slug]!.src} poster={READER_CLIPS[b.slug]!.poster} width={640} height={640} label={READER_CLIPS[b.slug]!.caption} />
              <span className="mt-2.5 block px-1 font-display text-[0.95rem] leading-tight group-hover:text-leaf">{b.title}</span>
            </Link>
          </Reveal>
        ))}
      </ul>

      <div className="content-grid mt-12">
        <h3 className="label-caps text-ink-soft">Watch, with sound</h3>
        <ul className="mt-5 grid snap-x snap-mandatory auto-cols-[78%] grid-flow-col items-start gap-5 overflow-x-auto pb-4 sm:auto-cols-[46%] lg:auto-cols-auto lg:grid-flow-row lg:grid-cols-4 lg:overflow-visible">
          {HOME_VIDEOS.map((m) =>
            m.kind === "video" ? (
              <li key={m.src} className="snap-center">
                <figure>
                  <LazyVideo src={m.src} poster={m.poster} width={m.width} height={m.height} label={m.caption} className="max-h-[30rem] rounded-2xl" />
                  <figcaption className="mt-3 text-small text-ink-soft">{m.caption}</figcaption>
                </figure>
              </li>
            ) : null,
          )}
        </ul>
      </div>
    </section>
  );
}

/** Pages coloured by readers, pinned under the framed one. Click to see a page large. */
export function ColouredByReaders() {
  return (
    <div className="content-grid relative pb-24 md:pb-32">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="label-caps text-ink-soft">More from readers&apos; walls</h3>
        <Link href="/gallery" className="text-small font-medium underline decoration-line underline-offset-4 hover:text-leaf">
          See the whole gallery
        </Link>
      </div>
      <ul className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
        {HOME_COLOURED.map((c, i) => (
          <Reveal as="li" key={c.src} delay={Math.min(i, 5) * 0.05}>
            <figure className={cn("bg-white p-2 pb-3 shadow-[0_18px_30px_-22px_rgb(27_26_23/0.5)] transition-transform duration-500 ease-page hover:-translate-y-1 hover:rotate-0", TILT[(i + 2) % TILT.length])}>
              <Lightbox src={c.src} width={c.width} height={c.height} alt={c.alt} caption={`Coloured by a reader: ${c.caption.toLowerCase()}.`} label={`Enlarge: ${c.caption}`}>
                <Image src={c.src} alt={c.alt} width={c.width} height={c.height} sizes="(min-width: 1024px) 180px, (min-width: 640px) 30vw, 45vw" className="aspect-square w-full object-cover" />
              </Lightbox>
              <figcaption className="mt-2 px-1 text-[0.8rem] text-ink-soft">{c.caption}</figcaption>
            </figure>
          </Reveal>
        ))}
      </ul>
    </div>
  );
}
