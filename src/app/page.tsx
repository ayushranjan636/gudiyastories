import Image from "next/image";
import Link from "next/link";
import { BookCheck, Printer, Truck, Wallet } from "lucide-react";
import { getCatalogue } from "@/features/catalogue/repo";
import { Hero } from "@/components/home/hero";
import { Bookshelf, type ShelfBook } from "@/components/home/bookshelf";
import { ValuesExplorer } from "@/components/home/values-explorer";
import { SelfColouringMandala } from "@/components/home/mandala";
import { Valley } from "@/components/home/valley";
import { Reveal } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/ui/button";
import { DeckledDivider } from "@/components/ui/deckled-divider";
import { AfterTheStoryCard } from "@/components/site/after-the-story-card";
import { AWARDS } from "@/content/author";
import { formatINR } from "@/lib/money";
import { getPublishedPosts } from "@/features/blog/repo";
import { formatDate } from "@/lib/format";
import { SiteShell } from "@/components/site/site-shell";
import { RecognitionPhotos } from "@/components/site/recognition-photos";
import { FramedArt } from "@/components/home/reader-wall";
import { whatsappLink } from "@/config/site";
import { getClasses, getPopupClass } from "@/features/classes/repo";
import { ClassCard } from "@/components/site/class-card";
import { ClassPopup } from "@/components/site/class-popup";
import { formatClassPrice, startLabel } from "@/features/classes/format";

// Re-checked every minute so scheduled blog posts and stock changes show up on their own.
export const revalidate = 60;

export default async function HomePage() {
  const { products, values } = await getCatalogue();
  const valueName = new Map(values.map((v) => [v.slug, v.name]));
  const stories = products.filter((p) => p.type === "STORY");
  const colouring = products.filter((p) => p.type === "COLOURING");
  const colouringSet = products.find((p) => p.type === "BUNDLE" && p.components.every((c) => colouring.some((b) => b.slug === c.slug)));
  const [allPosts, allClasses, popup] = await Promise.all([getPublishedPosts(), getClasses(), getPopupClass()]);
  const posts = allPosts.slice(0, 3);
  const classes = allClasses.filter((c) => c.status === "PUBLISHED").slice(0, 3);

  const shelf: ShelfBook[] = [...stories, ...colouring].map((p) => ({
    slug: p.slug,
    title: p.title.replace(/^Focus: /, ""),
    shortDescription: p.shortDescription,
    spineColor: p.spineColor,
    pages: p.pages,
    ageMin: p.ageMin,
    ageMax: p.ageMax,
    pricePaise: p.pricePaise,
    mrpPaise: p.mrpPaise,
    cover: p.cover,
    valueNames: p.values.map((v) => valueName.get(v) ?? v),
  }));

  const valueRows = values.map((v) => ({
    ...v,
    covers: products
      .filter((p) => p.type !== "BUNDLE" && p.values.includes(v.slug))
      .map((p) => ({ slug: p.slug, src: p.cover.src, alt: p.cover.alt, w: p.cover.width, h: p.cover.height })),
  }));

  const donimalai = products.find((p) => p.slug === "mystical-landscapes-of-donimalai");

  return (
    // The home page lives at app/page.tsx (outside the (site) group), so it adds the shell itself.
    <SiteShell>
      <Hero />

      {/* The shelf */}
      <section aria-labelledby="shelf-title" className="content-grid py-16 md:py-24">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label-caps text-ink-soft">The shelf</p>
            <h2 id="shelf-title" className="mt-3 max-w-[18ch] text-h2">
              Six stories and three colouring books. All written and designed by one teacher.
            </h2>
          </div>
          <ButtonLink href="/books" variant="text">
            See every book and set
          </ButtonLink>
        </Reveal>
        <div className="mt-6">
          <Bookshelf books={shelf} />
        </div>
      </section>

      {/* Values */}
      <section aria-labelledby="values-title" className="content-grid py-16 md:py-24">
        <Reveal>
          <p className="label-caps text-ink-soft">Shop by value</p>
          <h2 id="values-title" className="mt-3 text-h2">
            Choose by what matters to you.
          </h2>
          <p className="mt-4 max-w-[52ch] text-ink-soft">
            Start with the conversation you want to have at home, then pick by age. Each value links to the books that carry it.
          </p>
        </Reveal>
        <div className="mt-10">
          <ValuesExplorer values={valueRows} />
        </div>
      </section>

      {/* Author */}
      <DeckledDivider />
      <section aria-labelledby="author-title" className="bg-paper-deep">
        <div className="content-grid grid gap-12 py-16 md:py-24 lg:grid-cols-12 lg:gap-16">
          <Reveal className="lg:col-span-5">
            <figure className="relative mx-auto max-w-sm rotate-[-1.5deg] bg-white p-3 pb-12 shadow-[0_30px_40px_-30px_rgb(27_26_23/0.5)]">
              <span aria-hidden="true" className="absolute -top-3 left-8 h-7 w-20 rotate-[-6deg] bg-lime/35" />
              <span aria-hidden="true" className="absolute -top-2 right-6 h-7 w-16 rotate-[8deg] bg-[#F2B91E]/35" />
              <Image
                src="/authors/sv-bharathi.jpg"
                alt="S.V. Bharathi, author and designer of Gudiya Stories"
                width={600}
                height={800}
                sizes="(min-width: 1024px) 360px, 80vw"
                className="aspect-[4/5] w-full object-cover grayscale"
              />
              <figcaption className="absolute right-0 bottom-3 left-0 text-center font-display text-ink-soft">
                S.V. Bharathi, Tirupati
              </figcaption>
            </figure>
          </Reveal>
          <div className="lg:col-span-7">
            <Reveal>
              <p className="label-caps text-ink-soft">The author</p>
              <h2 id="author-title" className="mt-3 max-w-[20ch] text-h2">
                Written by a teacher who still sits on the small chairs.
              </h2>
              <p className="mt-6 max-w-[58ch] text-lead">
                Bharathi has spent more than fifteen years in early-years classrooms. She writes for the questions children
                actually ask, then tests every story by reading it aloud to them.
              </p>
              <p className="mt-4 max-w-[58ch] text-ink-soft">
                She grew up in Donimalai, a mining town in a green valley in Karnataka, and you will find that valley in her
                books.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <h3 className="mt-10 font-sans label-caps text-ink-soft">Recognition</h3>
              <ul className="mt-3 border-t border-ink/15">
                {AWARDS.map((a) => (
                  <li key={a.title} className="grid grid-cols-[4rem_1fr] gap-4 border-b border-ink/15 py-3">
                    <span className="tabular-nums text-ink-soft">{a.year}</span>
                    <span>
                      {a.title}
                      {a.by ? <span className="text-ink-soft">, {a.by}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
              <Link href="/about" className="mt-6 inline-block font-medium text-leaf underline decoration-lime decoration-2 underline-offset-[6px]">
                Read Bharathi&apos;s story
              </Link>
            </Reveal>
          </div>
        </div>
        <div className="content-grid pb-20 md:pb-28">
          <Reveal>
            <h3 className="font-sans label-caps text-ink-soft">With the books, in person</h3>
          </Reveal>
          <RecognitionPhotos className="mt-8 lg:max-w-4xl" />
        </div>
      </section>
      <DeckledDivider direction="up" className="-mt-px" />

      {/* After the story */}
      <section aria-labelledby="after-title" className="content-grid grid items-center gap-12 py-16 md:py-24 lg:grid-cols-12">
        <Reveal className="lg:col-span-6">
          <p className="label-caps text-ink-soft">After the story</p>
          <h2 id="after-title" className="mt-3 max-w-[16ch] text-h2">
            The book ends. The conversation doesn&apos;t have to.
          </h2>
          <p className="mt-6 max-w-[48ch] text-lead text-ink-soft">
            Every book comes with a free printable card of questions to ask once the last page is turned. Written by Bharathi,
            tested in her classroom.
          </p>
          <ButtonLink href="/resources" variant="secondary" className="mt-8">
            See the free resources
          </ButtonLink>
        </Reveal>
        <div className="lg:col-span-6">
          <AfterTheStoryCard />
        </div>
      </section>

      {/* Colouring */}
      <section aria-labelledby="colour-title" className="content-grid grid items-center gap-12 py-16 md:py-24 lg:grid-cols-12">
        <div className="order-2 lg:order-1 lg:col-span-6">
          <SelfColouringMandala className="mx-auto w-full max-w-[30rem]" />
        </div>
        <Reveal className="order-1 lg:order-2 lg:col-span-6">
          <p className="label-caps text-ink-soft">The Focus colouring books</p>
          <h2 id="colour-title" className="mt-3 text-h2">
            Colour it, tear it out, frame it.
          </h2>
          <p className="mt-6 max-w-[46ch] text-lead text-ink-soft">
            Thirty-six perforated pages on 220gsm drawing paper. Thick enough for sketch pens. Made to be given away.
          </p>
          <ul className="mt-8 grid grid-cols-3 gap-4">
            {colouring.map((c) => (
              <li key={c.slug}>
                <Link href={`/books/${c.slug}`} className="group block">
                  <Image
                    src={c.cover.src}
                    alt={c.cover.alt}
                    width={c.cover.width}
                    height={c.cover.height}
                    sizes="140px"
                    className="w-full rounded-[2px] shadow-[0_14px_22px_-16px_rgb(27_26_23/0.6)] transition-transform duration-500 ease-page group-hover:-translate-y-1 group-hover:-rotate-1"
                  />
                  <span className="mt-2 block text-small">{formatINR(c.pricePaise)}</span>
                </Link>
              </li>
            ))}
          </ul>
          {colouringSet ? (
            <p className="mt-6 text-small">
              Or all three as the{" "}
              <Link href={`/sets/${colouringSet.slug}`} className="font-medium text-leaf underline decoration-lime decoration-2 underline-offset-4">
                Focus colouring set for {formatINR(colouringSet.pricePaise)}
              </Link>
              .
            </p>
          ) : null}
        </Reveal>
      </section>

      {/* A reader's page, framed */}
      <section aria-labelledby="wall-title" className="relative overflow-hidden bg-paper-deep">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(rgb(27_26_23/0.07)_1px,transparent_1px)] [background-size:18px_18px]"
        />
        <div className="content-grid relative grid items-center gap-16 py-24 md:py-32 lg:grid-cols-12">
          <FramedArt className="lg:col-span-6 lg:col-start-1" />
          <Reveal className="lg:col-span-5 lg:col-start-8">
            <p className="label-caps text-ink-soft">On the reader&apos;s wall</p>
            <h2 id="wall-title" className="mt-3 max-w-[16ch] text-h2">
              Some pages are too good to leave in the book.
            </h2>
            <p className="mt-6 max-w-[44ch] text-lead text-ink-soft">
              Every feather picked out in a different colour. This is what an afternoon with a colouring page can turn into, and why
              ours tear out cleanly, ready for a frame.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <ButtonLink href="/books?type=colouring" variant="secondary">
                See the colouring books
              </ButtonLink>
              <a
                href={whatsappLink("Hello Gudiya Stories, here is a page we coloured.")}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-leaf underline decoration-lime decoration-2 underline-offset-[6px]"
              >
                Send us yours
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Donimalai */}
      <section aria-labelledby="valley-title" className="relative mt-8 overflow-hidden">
        <Valley className="h-[20rem] w-full md:h-[26rem]" />
        <div className="bg-[#2F5E28] text-paper">
          <div className="content-grid grid gap-8 pt-4 pb-16 md:grid-cols-12 md:pb-20">
            <Reveal className="md:col-span-7">
              <p className="label-caps text-paper/70">Where the stories come from</p>
              <h2 id="valley-title" className="mt-3 text-h2">
                The valley is real.
              </h2>
              <p className="mt-5 max-w-[52ch] text-lead text-paper/85">
                Donimalai sits in a green valley in Karnataka. Bharathi grew up there, and one of her books sends Rani and her
                friends hiking into it, looking after what they find.
              </p>
            </Reveal>
            <Reveal delay={0.1} className="flex items-end gap-4 md:col-span-5 md:justify-end">
              {donimalai ? (
                <Link
                  href={`/books/${donimalai.slug}`}
                  className="inline-flex h-12 items-center rounded-full bg-paper px-6 font-medium text-ink transition-colors hover:bg-lime"
                >
                  Read about the book
                </Link>
              ) : null}
              <Link href="/about" className="font-medium underline decoration-lime decoration-2 underline-offset-[6px]">
                About Bharathi
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Interlude */}
      <section className="content-grid py-24 text-center md:py-32" aria-label="A note on screens">
        <Reveal>
          <p className="mx-auto max-w-[18ch] font-display text-[clamp(2.2rem,5vw,4rem)] leading-[1.05]">
            A book doesn&apos;t need charging.
          </p>
          <p className="mx-auto mt-5 max-w-[44ch] text-ink-soft">
            Thick pages, matte covers, no notifications. Made to be dropped in a school bag and read under a blanket.
          </p>
        </Reveal>
      </section>

      {/* Online classes */}
      {classes.length ? (
        <section aria-labelledby="classes-title" className="content-grid py-16 md:py-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <Reveal>
              <p className="label-caps text-ink-soft">Online classes</p>
              <h2 id="classes-title" className="mt-3 max-w-[18ch] text-h2">
                Learn with Bharathi, live.
              </h2>
            </Reveal>
            <ButtonLink href="/classes" variant="text">
              All classes
            </ButtonLink>
          </div>
          <ul className={`mt-10 grid gap-8 ${classes.length === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "md:grid-cols-2 lg:max-w-4xl"}`}>
            {classes.map((c, i) => (
              <Reveal as="li" key={c.id} delay={i * 0.06}>
                <ClassCard c={c} />
              </Reveal>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Schools */}
      <section aria-labelledby="schools-title" className="content-grid">
        <div className="grid gap-10 rounded-[28px] border border-line bg-white/50 p-8 md:p-12 lg:grid-cols-12">
          <Reveal className="lg:col-span-6">
            <p className="label-caps text-ink-soft">Schools, libraries and CSR</p>
            <h2 id="schools-title" className="mt-3 max-w-[18ch] text-h2">
              Buying for a classroom, a library or a CSR programme?
            </h2>
            <p className="mt-5 max-w-[46ch] text-ink-soft">
              We offer bulk pricing from 25 copies, a printed bookplate with your school or company name, and reading sessions
              with the author.
            </p>
            <ButtonLink href="/for-schools" className="mt-8">
              Plan a bulk order
            </ButtonLink>
          </Reveal>
          <Reveal delay={0.1} className="lg:col-span-6">
            <ol className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3 lg:grid-cols-1">
              {[
                ["25+", "copies", "Bulk pricing from the first carton."],
                ["Bookplate", "inside cover", "Your school or company name printed in every book."],
                ["Author visit", "or online", "A reading session with Bharathi for your children."],
              ].map(([big, small, text]) => (
                <li key={big} className="bg-paper p-6">
                  <p className="font-display text-h3">
                    {big} <span className="text-small text-ink-soft">{small}</span>
                  </p>
                  <p className="mt-1 text-small text-ink-soft">{text}</p>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      {/* Blog */}
      {posts.length ? (
        <section aria-labelledby="notes-title" className="content-grid py-16 md:py-24">
          <Reveal className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="notes-title" className="text-h2">
              Notes from the classroom
            </h2>
            <ButtonLink href="/blog" variant="text">
              Read the blog
            </ButtonLink>
          </Reveal>
          <ul className="mt-10 grid gap-8 md:grid-cols-3">
            {posts.map((p) => (
              <li key={p.slug} className="border-t border-line pt-5">
                <p className="text-small text-ink-soft">
                  {p.publishedAt ? formatDate(p.publishedAt) : null} · {p.readingMinutes} min read
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
        </section>
      ) : null}

      {/* Trust */}
      <section aria-label="How we sell" className="content-grid pt-20">
        <ul className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Truck, title: "Ships across India", text: "Sent from Tirupati." },
            { icon: BookCheck, title: "ISBN on every title", text: "Registered, listed and traceable." },
            { icon: Printer, title: "Printed in India", text: "300gsm art paper with a matte finish." },
            { icon: Wallet, title: "Pay how you like", text: "UPI, card, or order on WhatsApp." },
          ].map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-4 bg-paper p-6">
              <Icon className="mt-0.5 size-5 shrink-0 text-leaf" strokeWidth={1.5} aria-hidden="true" />
              <div>
                <p className="font-medium">{title}</p>
                <p className="text-small text-ink-soft">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
      {popup ? (
        <ClassPopup
          c={{
            id: popup.id,
            version: popup.updatedAt.toISOString(),
            slug: popup.slug,
            title: popup.title,
            summary: popup.summary,
            start: startLabel(popup.startDate),
            duration: popup.duration,
            price: formatClassPrice(popup.pricePaise),
            priceNote: popup.priceNote,
            enquiryUrl: popup.enquiryUrl,
            mediaKind: popup.mediaKind,
            mediaUrl: popup.mediaUrl,
            posterUrl: popup.posterUrl,
            mediaAlt: popup.mediaAlt,
          }}
        />
      ) : null}
    </SiteShell>
  );
}
