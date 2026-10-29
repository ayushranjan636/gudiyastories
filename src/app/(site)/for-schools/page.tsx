import type { Metadata } from "next";
import Image from "next/image";
import { getCatalogue } from "@/features/catalogue/repo";
import { Reveal } from "@/components/motion/reveal";
import { EnquiryForm } from "./enquiry-form";

export const metadata: Metadata = {
  title: "For schools, libraries and CSR",
  description:
    "Bulk orders of Gudiya Stories books for schools, libraries, NGOs and CSR programmes, with custom bookplates and author reading sessions.",
};

const TIERS = [
  { min: "25+", label: "copies", text: "A classroom set. Bulk pricing starts here." },
  { min: "100+", label: "copies", text: "A whole grade, or a library shelf." },
  { min: "500+", label: "copies", text: "A district, a chain of schools or a CSR programme." },
];

export default async function ForSchoolsPage() {
  const { products } = await getCatalogue();
  const singles = products.filter((p) => p.type !== "BUNDLE");

  return (
    <>
      <section className="content-grid grid gap-12 pt-10 pb-16 md:pt-16 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p className="label-caps text-ink-soft">Schools, libraries, NGOs and CSR</p>
          <h1 className="mt-4 text-hero">Books for a whole classroom.</h1>
          <p className="mt-6 max-w-[54ch] text-lead text-ink-soft">
            Bharathi has spent fifteen years in early-years classrooms. These books were written to be read aloud to a room
            of children, then talked about. That makes them a good fit for reading programmes, libraries and CSR giving.
          </p>
        </div>
        <div className="relative hidden lg:col-span-5 lg:block" aria-hidden="true">
          <div className="relative mx-auto h-full min-h-[18rem] max-w-sm">
            {singles.slice(0, 6).map((p, i) => (
              <Image
                key={p.slug}
                src={p.cover.src}
                alt=""
                width={p.cover.width}
                height={p.cover.height}
                sizes="150px"
                className="absolute w-32 rounded-[2px] shadow-[0_16px_24px_-16px_rgb(27_26_23/0.6)]"
                style={{ left: `${(i % 3) * 32}%`, top: `${Math.floor(i / 3) * 46 + (i % 2) * 6}%`, rotate: `${((i * 7) % 11) - 5}deg` }}
              />
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="tiers-title" className="content-grid">
        <h2 id="tiers-title" className="sr-only">
          Order sizes
        </h2>
        <ol className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
          {TIERS.map((t, i) => (
            <Reveal as="li" key={t.min} delay={i * 0.08} className="bg-paper p-7">
              <p className="font-display text-h2">
                {t.min} <span className="text-small text-ink-soft">{t.label}</span>
              </p>
              <p className="mt-2 text-ink-soft">{t.text}</p>
            </Reveal>
          ))}
        </ol>
        <p className="mt-4 text-small text-ink-soft">
          We quote every bulk order individually, based on titles, quantity and delivery city.
        </p>
      </section>

      <section aria-labelledby="extras-title" className="content-grid grid gap-10 py-20 md:grid-cols-3">
        <h2 id="extras-title" className="sr-only">
          What we can add
        </h2>
        {[
          {
            t: "A bookplate with your name",
            d: "A printed label inside the front cover: your school crest, your company name, or a line from your programme.",
          },
          {
            t: "A reading session with the author",
            d: "Bharathi reads with your children and runs the after-the-story conversation. In person in Andhra Pradesh and Karnataka, online elsewhere.",
          },
          {
            t: "A sample pack first",
            d: "Not sure which titles suit your age group? We can send a sample pack so your teachers can decide.",
          },
        ].map((x, i) => (
          <Reveal key={x.t} delay={i * 0.08} className="border-t border-ink pt-5">
            <h3 className="text-h4">{x.t}</h3>
            <p className="mt-2 text-ink-soft">{x.d}</p>
          </Reveal>
        ))}
      </section>

      <section aria-labelledby="form-title" className="content-grid grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <h2 id="form-title" className="text-h2">
            Plan a bulk order
          </h2>
          <p className="mt-4 text-ink-soft">
            Tell us roughly what you need. You don&apos;t have to know the exact titles yet; we can suggest a mix for your age
            group.
          </p>
        </div>
        <div className="lg:col-span-8">
          <EnquiryForm titles={singles.map((p) => ({ sku: p.sku, title: p.title }))} />
        </div>
      </section>
    </>
  );
}
