import Image from "next/image";
import { ButtonLink } from "@/components/ui/button";
import { Butterfly } from "@/components/motion/butterfly";
import { HeroButterflyFlight } from "./hero-butterfly-flight";

const WORD = "GUDIYA STORIES";

// Runs during HTML parse, before first paint: decides whether this visit gets
// the intro (once per session, never with reduced motion).
const INTRO_SCRIPT = `try{var d=document.documentElement;if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&!sessionStorage.getItem('gs-intro')){d.dataset.intro='run';sessionStorage.setItem('gs-intro','1')}else{d.dataset.intro='done'}}catch(e){}`;

/** The logo's arch, rebuilt as live triple-line lettering on a circle. */
function Arch() {
  // Circle centre (300, 300), radius 238. Path runs clockwise from 215° to -35°.
  const cx = 300;
  const cy = 300;
  const r = 232;
  const a0 = (215 * Math.PI) / 180;
  const a1 = (-35 * Math.PI) / 180;
  const x0 = (cx + r * Math.cos(a0)).toFixed(1);
  const y0 = (cy - r * Math.sin(a0)).toFixed(1);
  const x1 = (cx + r * Math.cos(a1)).toFixed(1);
  const y1 = (cy - r * Math.sin(a1)).toFixed(1);
  const d = `M${x0} ${y0} A${r} ${r} 0 1 1 ${x1} ${y1}`;
  // Triple-line lettering: lime core, then paper and lime rings around it.
  const layers = [
    { stroke: "var(--lime)", w: 15, fill: "none", cls: "arch-draw" },
    { stroke: "var(--paper)", w: 10.4, fill: "none", cls: "" },
    { stroke: "var(--lime)", w: 6, fill: "var(--lime)", cls: "" },
    { stroke: "var(--paper)", w: 2.2, fill: "none", cls: "" },
  ];
  return (
    <svg viewBox="0 0 600 520" className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
      <defs>
        <path id="hero-arch" d={d} />
      </defs>
      {layers.map((l, li) => (
        <text
          key={li}
          className={l.cls}
          fill={l.fill}
          stroke={l.stroke}
          strokeWidth={l.w}
          strokeLinejoin="round"
          style={{ fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 82 }}
        >
          <textPath href="#hero-arch" startOffset="50%" textAnchor="middle" textLength={930} lengthAdjust="spacing">
            {WORD.split("").map((ch, i) => (
              <tspan key={i} className="arch-letter" style={{ ["--i" as string]: i }}>
                {ch}
              </tspan>
            ))}
          </textPath>
        </text>
      ))}
    </svg>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-x-clip" id="hero">
      <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
      <div className="content-grid grid items-center gap-x-10 gap-y-6 pt-10 pb-16 md:pt-16 lg:grid-cols-12 lg:pb-24">
        <div className="relative z-10 lg:col-span-6">
          <p className="label-caps text-ink-soft">Picture books from Tirupati</p>
          <h1 className="mt-5 max-w-[15ch] text-hero">
            Books that give children something to <span className="pencil">talk</span> about.
            <span id="hero-bfly-anchor" className="relative ml-2 inline-block w-[0.9em] align-[0.1em]">
              <Butterfly flapping className="w-full rotate-[14deg]" />
            </span>
          </h1>
          <p className="mt-6 max-w-[46ch] text-lead text-ink-soft">
            Value-based picture books and mindful colouring books, written and designed by early-years teacher S.V. Bharathi
            in Tirupati.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
            <ButtonLink href="/books" size="lg">
              Browse the books
            </ButtonLink>
            <ButtonLink href="/for-schools" variant="text">
              For schools and gifting
            </ButtonLink>
          </div>
          <p className="mt-8 text-small text-ink-soft">Printed in India · ISBN registered · Ships across India</p>
        </div>

        <div className="relative mx-auto w-full max-w-[34rem] lg:col-span-6 lg:max-w-none">
          <div className="relative aspect-[600/520]">
            <Arch />
            {/* Doll and book, from the logo file. Positioned inside the arch. */}
            <div className="hero-doll absolute top-[30%] left-[18%] w-[64%]">
              <Image
                src="/brand/gudiya-stories-mark.png"
                alt="The Gudiya Stories doll holding an open green book that reads Give wings to imagination"
                width={667}
                height={490}
                preload
                sizes="(min-width: 1024px) 380px, 62vw"
                className="h-auto w-full"
              />
              <span id="hero-bfly-start" className="absolute top-[62%] left-[24%] size-1" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>
      <HeroButterflyFlight />
    </section>
  );
}
