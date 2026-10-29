import { Reveal } from "@/components/motion/reveal";

// EXAMPLE questions drafted for layout. Listed in docs/CONTENT-TODO.md to be
// replaced with Bharathi's own card for Cheers to Monday.
const EXAMPLE = {
  book: "Cheers to Monday",
  questions: [
    "What did the girl feel on Sunday night? How could you tell?",
    "What helped her walk through the school gate?",
    "What is one thing you look forward to on a Monday?",
  ],
};

/** A printable card, drawn as one: punched hole, ruled lines, slight tilt. */
export function AfterTheStoryCard() {
  return (
    <Reveal y={24}>
      <div className="relative mx-auto max-w-md">
        <div aria-hidden="true" className="absolute inset-0 translate-x-3 translate-y-3 rotate-[3deg] rounded-xl border border-line bg-paper-deep" />
        <article className="relative rotate-[-2deg] rounded-xl border border-line bg-white p-7 pt-9 shadow-[0_30px_40px_-34px_rgb(27_26_23/0.6)] sm:p-9">
          <span aria-hidden="true" className="absolute top-4 left-1/2 size-3 -translate-x-1/2 rounded-full border border-line bg-paper" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="label-caps text-leaf">After the story</p>
              <p className="mt-1 font-display text-h4">{EXAMPLE.book}</p>
            </div>
            <span className="rounded-full border border-line px-2.5 py-0.5 text-[0.7rem] font-semibold tracking-[0.08em] text-ink-soft uppercase">
              Example
            </span>
          </div>
          <ol className="mt-6 space-y-0">
            {EXAMPLE.questions.map((q, i) => (
              <li
                key={q}
                className="grid grid-cols-[1.75rem_1fr] border-b border-dashed border-line py-3.5 text-[1.02rem] leading-snug"
              >
                <span className="font-display text-leaf">{i + 1}.</span>
                <span>{q}</span>
              </li>
            ))}
          </ol>
          <p className="mt-5 text-small text-ink-soft">Print it, keep it in the book, ask one question a night.</p>
        </article>
      </div>
    </Reveal>
  );
}
