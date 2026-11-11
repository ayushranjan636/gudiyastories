import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SITE } from "@/config/site";
import { COLOURED, READER_ART } from "@/content/gallery";
import { getCatalogue } from "@/features/catalogue/repo";
import { ReadersReel } from "@/components/home/readers-reel";
import { Reveal } from "@/components/motion/reveal";
import { Lightbox } from "@/components/ui/lightbox";
import { ButtonLink } from "@/components/ui/button";
import { JsonLd } from "@/components/site/json-ld";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Readers' gallery: mandala pages coloured by children",
  description:
    "Mandala colouring pages finished by children who read Gudiya Stories books: animals, birds and fruit coloured in sketch pen, plus short videos of the picture books at home.",
  alternates: { canonical: "/gallery" },
};

const TILT = ["rotate-[-1.4deg]", "rotate-[1deg]", "rotate-[-0.6deg]", "rotate-[1.5deg]", "rotate-[-1deg]", "rotate-[0.5deg]"];
const TAPE = ["bg-lime/40", "bg-[#F2B91E]/40", "bg-clay/25"];

export default async function GalleryPage() {
  const { products } = await getCatalogue();
  const titleOf = new Map(products.map((p) => [p.slug, p.title]));
  const pages = [READER_ART, ...COLOURED];
  const base = SITE.url.replace(/\/$/, "");

  return (
    <>
      <section className="content-grid pt-10 md:pt-16">
        <header className="max-w-3xl">
          <p className="label-caps text-ink-soft">Readers&apos; gallery</p>
          <h1 className="mt-3 text-h2">Pages our readers coloured.</h1>
          <p className="mt-4 max-w-[58ch] text-lead text-ink-soft">
            Every page here was coloured by a child at home, usually in sketch pen, one small shape at a time. Families send
            them to us on WhatsApp and Instagram. Tap a page to see it large.
          </p>
        </header>

        <ul className="mt-12 columns-2 gap-5 sm:columns-3 lg:columns-4 [&>li]:mb-5 [&>li]:break-inside-avoid [&>li]:pt-3">
          {pages.map((c, i) => {
            const book = c.book ? titleOf.get(c.book) : undefined;
            return (
              <Reveal as="li" key={c.src} delay={Math.min(i % 4, 3) * 0.05}>
                <figure
                  className={cn(
                    "relative bg-white p-2 pb-3 shadow-[0_20px_32px_-22px_rgb(27_26_23/0.5)] transition-transform duration-500 ease-page hover:-translate-y-1 hover:rotate-0",
                    TILT[i % TILT.length],
                  )}
                >
                  <span aria-hidden="true" className={cn("absolute -top-2.5 left-1/2 h-5 w-16 -translate-x-1/2 rotate-[-3deg]", TAPE[i % TAPE.length])} />
                  <Lightbox src={c.src} width={c.width} height={c.height} alt={c.alt} caption={`Coloured by a reader: ${c.caption.replace(/\.$/, "").toLowerCase()}.`} label={`Enlarge: ${c.caption}`}>
                    <Image src={c.src} alt={c.alt} width={c.width} height={c.height} sizes="(min-width: 1024px) 260px, (min-width: 640px) 30vw, 45vw" className="w-full" />
                  </Lightbox>
                  <figcaption className="mt-2 px-1 text-[0.82rem] leading-snug">
                    <span className="font-display">{c.caption.replace(/\.$/, "")}</span>
                    {book && c.book ? (
                      <Link href={`/books/${c.book}`} className="block text-ink-soft hover:text-leaf">
                        From {book.replace(/^Focus: /, "")}
                      </Link>
                    ) : null}
                  </figcaption>
                </figure>
              </Reveal>
            );
          })}
        </ul>

        <div className="mt-6 rounded-2xl border border-line bg-paper-deep p-6 md:flex md:items-center md:justify-between md:gap-8 md:p-8">
          <p className="max-w-[52ch] text-ink-soft">
            Has your child finished a page? Send us a photo on WhatsApp or tag{" "}
            <a href={SITE.instagram} target="_blank" rel="noopener noreferrer" className="text-ink underline decoration-line underline-offset-4 hover:text-leaf">
              @{SITE.instagramHandle}
            </a>{" "}
            and we&apos;ll ask before we put it up here.
          </p>
          <ButtonLink href="/books?type=colouring" className="mt-5 shrink-0 md:mt-0">
            See the colouring books
          </ButtonLink>
        </div>
      </section>

      <ReadersReel books={products.filter((p) => p.type !== "BUNDLE").map((p) => ({ slug: p.slug, title: p.title }))} />

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ImageGallery",
          name: "Gudiya Stories readers' gallery",
          url: `${base}/gallery`,
          description: "Mandala colouring pages from Gudiya Stories books, coloured by children at home.",
          publisher: { "@type": "Organization", name: SITE.name, url: base },
          image: pages.map((c) => ({
            "@type": "ImageObject",
            contentUrl: `${base}${c.src}`,
            width: c.width,
            height: c.height,
            caption: c.alt,
            creditText: "A Gudiya Stories reader",
            ...(c.book ? { about: { "@type": "Book", name: titleOf.get(c.book), url: `${base}/books/${c.book}` } } : {}),
          })),
        }}
      />
    </>
  );
}
