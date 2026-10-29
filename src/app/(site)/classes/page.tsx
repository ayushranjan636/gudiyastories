import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { getClasses } from "@/features/classes/repo";
import { ClassCard } from "@/components/site/class-card";
import { Reveal } from "@/components/motion/reveal";
import { SITE, whatsappLink } from "@/config/site";

export const metadata: Metadata = {
  title: "Online classes",
  description: `Live online classes taught by ${SITE.author}. See what each class covers, when it starts and what it costs, then enquire.`,
};
export const revalidate = 60;

const STEPS = [
  { n: "1", title: "Pick a class", text: "Each one lists the topics, dates, timings and fee." },
  { n: "2", title: "Send an enquiry", text: "A short form: your name, your child's age, a number to reach you." },
  { n: "3", title: "We confirm", text: "You hear back with the joining link and how to pay." },
];

export default async function ClassesPage() {
  const classes = await getClasses();
  const open = classes.filter((c) => c.status === "PUBLISHED");
  const closed = classes.filter((c) => c.status === "CLOSED");

  return (
    <div className="pt-10 md:pt-16">
      <header className="content-grid">
        <div className="max-w-3xl">
          <p className="label-caps text-ink-soft">Online classes</p>
          <h1 className="mt-4 text-hero">Learn with Bharathi, live and online.</h1>
          <p className="mt-6 max-w-[54ch] text-lead text-ink-soft">
            Small live classes taught by {SITE.author}. Read what each one covers, then send an enquiry through its form.
          </p>
        </div>
        <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="flex gap-4 bg-paper p-6">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-lime/40 font-display tabular-nums">{s.n}</span>
              <div>
                <p className="font-medium">{s.title}</p>
                <p className="mt-1 text-small text-ink-soft">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </header>

      <section aria-labelledby="open-title" className="content-grid mt-16">
        <h2 id="open-title" className="sr-only">
          Classes taking enquiries
        </h2>
        {open.length ? (
          <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {open.map((c, i) => (
              <Reveal as="li" key={c.id} delay={Math.min(i, 3) * 0.06}>
                <ClassCard c={c} priority={i < 3} />
              </Reveal>
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border border-dashed border-line p-10">
            <p className="font-display text-h3">New classes are being planned.</p>
            <p className="mt-3 max-w-[52ch] text-ink-soft">Leave your number on WhatsApp and you will hear when the next one opens.</p>
            <a
              href={whatsappLink("Hello Gudiya Stories, please tell me when the next online class opens.")}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-small font-medium text-paper hover:bg-leaf"
            >
              <MessageCircle className="size-4" strokeWidth={1.5} aria-hidden="true" /> Tell me on WhatsApp
            </a>
          </div>
        )}
      </section>

      {closed.length ? (
        <section aria-labelledby="past-title" className="content-grid mt-20">
          <h2 id="past-title" className="text-h3">
            Enquiries closed
          </h2>
          <ul className="mt-8 grid gap-8 opacity-90 sm:grid-cols-2 lg:grid-cols-3">
            {closed.map((c) => (
              <li key={c.id}>
                <ClassCard c={c} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="content-grid mt-20">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-paper-deep p-8 md:flex-row md:items-center md:p-10">
          <div>
            <p className="font-display text-h3">A question before you enquire?</p>
            <p className="mt-2 text-ink-soft">Timings, age groups, a class for your school: ask on WhatsApp.</p>
          </div>
          <a
            href={whatsappLink("Hello Gudiya Stories, I have a question about the online classes.")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-ink/70 px-5 text-small font-medium hover:bg-paper"
          >
            <MessageCircle className="size-4" strokeWidth={1.5} aria-hidden="true" /> {SITE.phoneDisplay}
          </a>
        </div>
      </section>
    </div>
  );
}
