import Image from "next/image";
import { MOMENTS } from "@/content/gallery";
import { Reveal } from "@/components/motion/reveal";
import { Lightbox } from "@/components/ui/lightbox";
import { cn } from "@/lib/cn";

const TILT = ["rotate-[-1.6deg]", "rotate-[1.4deg]"];
const TAPE = ["bg-lime/40", "bg-[#F2B91E]/40"];

/** Event photos pinned like prints on a board. Click to enlarge. */
export function RecognitionPhotos({ className }: { className?: string }) {
  return (
    <ul className={cn("grid gap-10 sm:grid-cols-2 sm:gap-8", className)}>
      {MOMENTS.map((m, i) => (
        <Reveal as="li" key={m.src} delay={0.08 * i}>
          <figure
            className={cn(
              "group relative bg-white p-2.5 pb-4 shadow-[0_24px_36px_-26px_rgb(27_26_23/0.55)] transition-transform duration-500 ease-page hover:-translate-y-1 hover:rotate-0",
              TILT[i % 2],
            )}
          >
            <span aria-hidden="true" className={cn("absolute -top-3 left-1/2 h-6 w-20 -translate-x-1/2 rotate-[-3deg]", TAPE[i % 2])} />
            <Lightbox src={m.src} width={m.width} height={m.height} alt={m.alt} caption={m.caption} label={`Enlarge photo: ${m.caption}`}>
              <Image
                src={m.src}
                alt={m.alt}
                width={m.width}
                height={m.height}
                sizes="(min-width: 1024px) 420px, (min-width: 640px) 45vw, 90vw"
                className="aspect-[4/3] w-full object-cover"
              />
            </Lightbox>
            <figcaption className="mt-3 px-1 text-small text-ink-soft">{m.caption}</figcaption>
          </figure>
        </Reveal>
      ))}
    </ul>
  );
}
