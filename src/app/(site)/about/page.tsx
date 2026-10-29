import type { Metadata } from "next";
import Image from "next/image";
import { Valley } from "@/components/home/valley";
import { Reveal } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/ui/button";
import { AWARDS } from "@/content/author";
import { RecognitionPhotos } from "@/components/site/recognition-photos";

export const metadata: Metadata = {
  title: "About",
  description: "Gudiya Stories is S.V. Bharathi, an early-years teacher in Tirupati who writes and designs value-based picture books.",
};

const STEPS = [
  { n: "01", title: "Write", text: "Each story starts from the questions children actually ask in class." },
  { n: "02", title: "Read aloud", text: "Bharathi reads every draft aloud to children before it is final." },
  { n: "03", title: "Design", text: "She designs every spread herself, so the words and pictures are planned together." },
  { n: "04", title: "Print", text: "Printed in India on 300gsm art paper with a matte finish." },
];

export default function AboutPage() {
  return (
    <>
      <section className="content-grid grid gap-12 pt-10 pb-16 md:pt-16 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p className="label-caps text-ink-soft">About Gudiya Stories</p>
          <h1 className="mt-4 text-hero">One teacher. A valley. Some very honest readers.</h1>
          <p className="mt-8 max-w-[56ch] text-lead">
            Gudiya means doll. It is what a lot of families in India call their little girl, and it is the doll on our logo
            holding an open book.
          </p>
          <p className="mt-4 max-w-[56ch] text-ink-soft">
            Gudiya Stories is the publishing side of S.V. Bharathi&apos;s classroom work. She has taught in early-years
            classrooms for more than fifteen years, with a background in the IB curriculum, and she writes the stories she
            could not find on the shelf: ones that start a conversation about kindness, courage or family, and leave room for
            the child to answer.
          </p>
        </div>
        <div className="lg:col-span-5">
          <figure className="relative mx-auto max-w-sm rotate-[1.5deg] bg-white p-3 pb-12 shadow-[0_30px_40px_-30px_rgb(27_26_23/0.5)]">
            <span aria-hidden="true" className="absolute -top-3 right-10 h-7 w-20 rotate-[6deg] bg-lime/35" />
            <Image
              src="/authors/sv-bharathi.jpg"
              alt="S.V. Bharathi"
              width={600}
              height={800}
              preload
              className="aspect-[4/5] w-full object-cover grayscale"
            />
            <figcaption className="absolute right-0 bottom-3 left-0 text-center font-display text-ink-soft">S.V. Bharathi</figcaption>
          </figure>
        </div>
      </section>

      <section aria-labelledby="valley-title" className="relative">
        <Valley className="h-[18rem] w-full md:h-[24rem]" />
        <div className="bg-[#2F5E28] text-paper">
          <div className="content-grid grid gap-8 pt-4 pb-16 md:grid-cols-12">
            <h2 id="valley-title" className="text-h2 md:col-span-5">
              Where she grew up
            </h2>
            <div className="space-y-4 text-lead text-paper/85 md:col-span-7">
              <p>
                Donimalai is a small mining township in a green valley in Karnataka, ringed by hills and forest. Bharathi grew
                up there.
              </p>
              <p>
                Her book <em>Mystical Landscapes of Donimalai</em> sends Rani and her friends up the same paths, and asks
                what it means to leave a forest cleaner than you found it.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="how-title" className="content-grid py-20 md:py-28">
        <Reveal>
          <p className="label-caps text-ink-soft">How a book is made</p>
          <h2 id="how-title" className="mt-3 text-h2">
            Four steps, and children have a say before the last one.
          </h2>
        </Reveal>
        <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-4">
          {STEPS.map((s, i) => (
            <Reveal as="li" key={s.n} delay={i * 0.08} className="bg-paper p-6 md:p-8">
              <p className="font-display text-h2 text-lime">{s.n}</p>
              <h3 className="mt-6 text-h4">{s.title}</h3>
              <p className="mt-2 text-ink-soft">{s.text}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      <section aria-labelledby="awards-title" className="content-grid grid gap-10 lg:grid-cols-12">
        <h2 id="awards-title" className="text-h3 lg:col-span-4">
          Recognition for her teaching
        </h2>
        <ul className="border-t border-line lg:col-span-8">
          {AWARDS.map((a) => (
            <li key={a.title} className="grid grid-cols-[4rem_1fr] gap-4 border-b border-line py-4">
              <span className="text-ink-soft tabular-nums">{a.year}</span>
              <span>
                {a.title}
                {a.by ? <span className="block text-small text-ink-soft">{a.by}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="moments-title" className="content-grid grid gap-10 pt-20 lg:grid-cols-12">
        <h2 id="moments-title" className="text-h3 lg:col-span-4">
          With the books, in person
        </h2>
        <RecognitionPhotos className="lg:col-span-8" />
      </section>

      <section className="content-grid pt-20 text-center">
        <p className="mx-auto max-w-[24ch] font-display text-h2">Start in the valley.</p>
        <div className="mt-8 flex justify-center gap-4">
          <ButtonLink href="/books/mystical-landscapes-of-donimalai" size="lg">
            Mystical Landscapes of Donimalai
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
