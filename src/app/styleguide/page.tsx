import Image from "next/image";
import { BOOKS, VALUES } from "../../../prisma/data/catalogue";
import { Book3D } from "@/components/book/book-3d";
import { Button, ButtonLink } from "@/components/ui/button";
import { DeckledDivider } from "@/components/ui/deckled-divider";
import { contrastRatio } from "@/lib/contrast";
import { formatAges } from "@/lib/format";
import { formatINR, rupeesToPaise } from "@/lib/money";
import { FormDemo } from "./form-demo";
import { ValueFilterDemo, type DemoBook } from "./value-filter-demo";

const COLOURS = [
  { token: "--paper", hex: "#FBF8F1", use: "Page background" },
  { token: "--paper-deep", hex: "#F2EBDD", use: "Alternate sections, cards" },
  { token: "--ink", hex: "#1B1A17", use: "Text, the doll's black" },
  { token: "--ink-soft", hex: "#5A5650", use: "Secondary text" },
  { token: "--line", hex: "#E4DCCB", use: "Hairlines, borders" },
  { token: "--leaf", hex: "#2F6B2A", use: "Links, primary buttons, focus rings" },
  { token: "--lime", hex: "#65D428", use: "Decoration only. Never text." },
  { token: "--clay", hex: "#B4532F", use: "Sale price and errors only" },
] as const;

const PAIRS = [
  { fg: "#1B1A17", bg: "#FBF8F1", label: "Ink on paper" },
  { fg: "#5A5650", bg: "#FBF8F1", label: "Ink soft on paper" },
  { fg: "#5A5650", bg: "#F2EBDD", label: "Ink soft on paper deep" },
  { fg: "#2F6B2A", bg: "#FBF8F1", label: "Leaf on paper" },
  { fg: "#2F6B2A", bg: "#F2EBDD", label: "Leaf on paper deep" },
  { fg: "#FFFFFF", bg: "#2F6B2A", label: "White on leaf (primary button)" },
  { fg: "#FBF8F1", bg: "#1B1A17", label: "Paper on ink (selected chip)" },
  { fg: "#B4532F", bg: "#FBF8F1", label: "Clay on paper" },
  { fg: "#B4532F", bg: "#F2EBDD", label: "Clay on paper deep (do not use)" },
];

const TYPE_SCALE = [
  { name: "Hero", className: "font-display text-hero", spec: "Young Serif · clamp(2.5rem, 6vw, 5rem) · -0.01em", sample: "Books that give children something to talk about." },
  { name: "H2", className: "font-display text-h2", spec: "Young Serif · clamp(2rem → 3.25rem)", sample: "Choose by what matters to you." },
  { name: "H3", className: "font-display text-h3", spec: "Young Serif · clamp(1.5rem → 2rem)", sample: "The book ends. The conversation doesn't have to." },
  { name: "H4 / book title", className: "font-display text-h4", spec: "Young Serif · clamp(1.25rem → 1.4375rem)", sample: "Mystical Landscapes of Donimalai" },
  { name: "Lead", className: "text-lead", spec: "Hanken Grotesk 400 · clamp(1.1875rem → 1.375rem)", sample: "Value-based picture books and mindful colouring books, written and designed by early-years teacher S.V. Bharathi in Tirupati." },
  { name: "Body", className: "text-body", spec: "Hanken Grotesk 400 · 17–18px · 1.6 · max 68ch", sample: "Every book comes with a free printable card of questions to ask once the last page is turned. Written by Bharathi, tested in her classroom." },
  { name: "Small", className: "text-small text-ink-soft", spec: "Hanken Grotesk 400 · 15px", sample: "Printed in India · ISBN registered · Ships across India" },
  { name: "Label", className: "label-caps text-ink-soft", spec: "Hanken Grotesk 600 · 12px · tracked, the only all-caps style", sample: "Ages 6–8 · 12 pages" },
];

function Section({ id, title, intro, children }: { id: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`${id}-title`} className="content-grid py-16 sm:py-20">
      <h2 id={`${id}-title`} className="text-h2">
        {title}
      </h2>
      {intro ? <p className="mt-3 max-w-prose text-ink-soft">{intro}</p> : null}
      <div className="mt-10">{children}</div>
    </section>
  );
}

const NAV = [
  ["colour", "Colour"],
  ["type", "Type"],
  ["buttons", "Buttons"],
  ["inputs", "Inputs"],
  ["book", "3D book"],
  ["chips", "Value chips"],
  ["divider", "Deckled divider"],
  ["brand", "Logo files"],
] as const;

export default function StyleguidePage() {
  const demoBooks: DemoBook[] = BOOKS.map((b) => ({
    sku: b.sku,
    title: b.title,
    values: b.values,
    ageMin: b.ageMin,
    ageMax: b.ageMax,
    pages: b.pages,
    pricePaise: rupeesToPaise(b.priceRupees),
    mrpPaise: rupeesToPaise(b.mrpRupees),
    spineColor: b.spineColor,
    cover: b.cover,
  }));
  const donimalai = BOOKS[0]!;

  return (
    <main id="main" className="pb-24">
      <header className="border-b border-line">
        <div className="content-grid flex flex-col gap-4 py-12 sm:py-16">
          <p className="label-caps text-ink-soft">Development only</p>
          <h1 className="text-hero">Styleguide</h1>
          <p className="max-w-prose text-lead text-ink-soft">
            Tokens, type and the components the public site is built from. The covers carry the colour, so the interface stays quiet.
          </p>
          <nav aria-label="Styleguide sections" className="mt-2">
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-small">
              {NAV.map(([id, label]) => (
                <li key={id}>
                  <a href={`#${id}`} className="text-leaf underline decoration-lime decoration-2 underline-offset-4 hover:decoration-leaf">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <div id="colour" className="scroll-mt-8">
        <Section id="colour-s" title="Colour" intro="Eight tokens, defined as CSS variables and Tailwind theme colours (bg-paper, text-leaf, decoration-lime and so on). No gradients, no glass.">
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {COLOURS.map((c) => (
              <li key={c.token} className="overflow-hidden rounded-2xl border border-line bg-paper">
                <div className="h-24 border-b border-line" style={{ backgroundColor: c.hex }} />
                <div className="flex flex-col gap-0.5 p-4">
                  <code className="text-small font-semibold">{c.token}</code>
                  <span className="text-small text-ink-soft">{c.hex}</span>
                  <span className="text-small text-ink-soft">{c.use}</span>
                </div>
              </li>
            ))}
          </ul>

          <h3 className="mt-14 text-h4">Text contrast (WCAG AA needs 4.5:1)</h3>
          <ul className="mt-6 grid gap-3 sm:grid-cols-3">
            {PAIRS.map((p) => {
              const ratio = contrastRatio(p.fg, p.bg);
              const pass = ratio >= 4.5;
              return (
                <li key={p.label} className="flex items-center justify-between gap-4 rounded-xl border border-line p-4" style={{ backgroundColor: p.bg }}>
                  <span className="text-small font-medium" style={{ color: p.fg }}>
                    {p.label}
                  </span>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-label font-semibold ${pass ? "bg-paper text-ink" : "bg-ink text-paper"}`}>
                    {ratio.toFixed(2)} {pass ? "AA" : "Fail"}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 max-w-prose text-small text-ink-soft">
            Clay is used on the paper background only. Lime never carries text; it appears as underlines, small marks and the butterfly.
          </p>
        </Section>
      </div>

      <div id="type" className="scroll-mt-8 bg-paper-deep">
        <Section id="type-s" title="Type" intro="Young Serif for headings and book titles. Hanken Grotesk 400, 500 and 600 for everything else. Sentence case everywhere.">
          <dl className="flex flex-col divide-y divide-line">
            {TYPE_SCALE.map((t) => (
              <div key={t.name} className="grid gap-2 py-6 sm:grid-cols-[12rem_1fr] sm:gap-8">
                <dt className="flex flex-col gap-1">
                  <span className="text-small font-semibold">{t.name}</span>
                  <span className="text-small text-ink-soft">{t.spec}</span>
                </dt>
                <dd className={`${t.className} max-w-prose`}>{t.sample}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <p className="text-body font-normal">Hanken Grotesk 400. Thirty-six perforated pages on 220gsm drawing paper.</p>
            <p className="text-body font-medium">Hanken Grotesk 500. Thick enough for sketch pens.</p>
            <p className="text-body font-semibold">Hanken Grotesk 600. Made to be given away.</p>
          </div>
        </Section>
      </div>

      <div id="buttons" className="scroll-mt-8">
        <Section id="buttons-s" title="Buttons" intro="Sentence case, at least 40px tall, focus ring in leaf. Tab through them to check.">
          <div className="flex flex-col gap-10">
            <div className="flex flex-wrap items-center gap-4">
              <ButtonLink href="/styleguide#book">Browse the books</ButtonLink>
              <ButtonLink href="/styleguide#chips" variant="text">
                For schools and gifting
              </ButtonLink>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Button>Add to bag</Button>
              <Button variant="secondary">Look inside</Button>
              <Button variant="quiet">Order on WhatsApp</Button>
              <Button variant="text">Download the card</Button>
              <Button disabled>Out of stock</Button>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Button size="lg">Plan a bulk order</Button>
              <Button size="md">Add to bag</Button>
              <Button size="sm">Add to bag</Button>
              <Button size="sm" variant="secondary">
                Remove
              </Button>
            </div>
            <div className="flex flex-wrap items-baseline gap-4">
              <p className="text-h4 font-display">{formatINR(rupeesToPaise(donimalai.priceRupees))}</p>
              <s className="text-ink-soft">
                <span className="sr-only">MRP </span>
                {formatINR(rupeesToPaise(donimalai.mrpRupees))}
              </s>
              <p className="text-small font-semibold text-clay">Sale price colour (example only)</p>
              <p className="text-small text-ink-soft">Indian grouping: {formatINR(115000)} · {formatINR(12345600)}</p>
            </div>
          </div>
        </Section>
      </div>

      <div id="inputs" className="scroll-mt-8 border-t border-line">
        <Section id="inputs-s" title="Inputs" intro="Labels sit above fields. Hints and errors are linked with aria-describedby, and errors set aria-invalid. Try the PIN code field.">
          <div className="max-w-3xl">
            <FormDemo />
          </div>
        </Section>
      </div>

      <div id="book" className="scroll-mt-8 border-t border-line">
        <Section
          id="book-s"
          title="3D book"
          intro="Covers render as books with a spine and page edges. On desktop the book tilts toward the cursor by up to 6° and lifts. On touch screens it settles into place as it scrolls into view. With reduced motion it sits still."
        >
          <div className="grid items-end gap-16 lg:grid-cols-[minmax(0,22rem)_1fr]">
            <div className="mx-auto w-full max-w-[22rem] px-4">
              <Book3D
                src={donimalai.cover.src}
                alt={donimalai.cover.alt}
                width={donimalai.cover.width}
                height={donimalai.cover.height}
                pages={donimalai.pages}
                spineColor={donimalai.spineColor}
                sizes="(min-width: 1024px) 352px, 80vw"
                preload
              />
            </div>
            <div className="flex flex-col gap-3">
              <p className="label-caps text-ink-soft">{formatAges(donimalai.ageMin, donimalai.ageMax)} · {donimalai.pages} pages</p>
              <h3 className="text-h3">{donimalai.title}</h3>
              <p className="max-w-prose">{donimalai.shortDescription}</p>
              <p className="text-small text-ink-soft">
                {donimalai.paper} · ISBN {donimalai.isbn}
              </p>
              <div className="mt-2 flex flex-wrap gap-4">
                <Button>Add to bag</Button>
                <Button variant="secondary">Look inside</Button>
              </div>
            </div>
          </div>

          <h3 className="mt-20 text-h4">Thickness follows the page count</h3>
          <ul className="mt-8 grid grid-cols-3 items-end gap-6 sm:gap-12">
            {[BOOKS[1]!, BOOKS[5]!, BOOKS[8]!].map((b) => (
              <li key={b.sku} className="flex flex-col gap-4">
                <Book3D src={b.cover.src} alt={b.cover.alt} width={b.cover.width} height={b.cover.height} pages={b.pages} spineColor={b.spineColor} sizes="(min-width: 1024px) 300px, 30vw" />
                <p className="text-small text-ink-soft">
                  {b.title}, {b.pages} pages
                </p>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <div id="chips" className="scroll-mt-8 border-t border-line">
        <Section
          id="chips-s"
          title="Value chips"
          intro="Choosing a value re-sorts the grid with a layout animation. Books that match move to the front. Arrow keys move between chips."
        >
          <ValueFilterDemo books={demoBooks} values={VALUES.map((v) => ({ slug: v.slug, name: v.name }))} />
        </Section>
      </div>

      <div id="divider" className="scroll-mt-8">
        <div className="content-grid pt-16">
          <h2 className="text-h2">Deckled divider</h2>
          <p className="mt-3 max-w-prose text-ink-soft">A torn-paper edge in paper deep. Two or three per page at most.</p>
        </div>
        <div className="mt-10">
          <DeckledDivider direction="up" />
          <div className="bg-paper-deep">
            <div className="content-grid py-14">
              <h3 className="text-h3">Colour it, tear it out, frame it.</h3>
              <p className="mt-3 max-w-prose">Thirty-six perforated pages on 220gsm drawing paper. Thick enough for sketch pens. Made to be given away.</p>
            </div>
          </div>
          <DeckledDivider direction="down" />
        </div>
      </div>

      <div id="brand" className="scroll-mt-8">
        <Section
          id="brand-s"
          title="Logo files"
          intro="Interim files cut from the client's PNG with scripts/derive-brand.mjs. Nothing is redrawn. The white panel is knocked out so the logo sits on paper. Replace with layered SVG when it arrives."
        >
          <div className="grid items-end gap-10 sm:grid-cols-[2fr_1fr]">
            <figure className="flex flex-col gap-3">
              <Image src="/brand/gudiya-stories-lockup.png" alt="Gudiya Stories" width={940} height={745} className="h-auto w-full max-w-md" />
              <figcaption className="text-small text-ink-soft">Full lockup: footer and About page.</figcaption>
            </figure>
            <figure className="flex flex-col gap-3">
              <Image src="/brand/gudiya-stories-mark.png" alt="Gudiya Stories" width={667} height={490} className="h-auto w-40" />
              <figcaption className="text-small text-ink-soft">Compact mark: header, favicon, social images.</figcaption>
            </figure>
          </div>
          <p className="mt-8 max-w-prose text-small text-ink-soft">
            The wordmark on its own cannot be cut cleanly from the PNG because the letters arch around the doll. It needs the source file. Listed in docs/CONTENT-TODO.md.
          </p>
        </Section>
      </div>
    </main>
  );
}
