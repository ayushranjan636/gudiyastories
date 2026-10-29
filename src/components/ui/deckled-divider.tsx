import { cn } from "@/lib/cn";

type DeckledDividerProps = {
  /** "down": the torn edge hangs into the next section. "up": rises from below. */
  direction?: "down" | "up";
  className?: string;
};

// Hand-tuned torn-paper edge. Drawn in --paper-deep so a section in paper-deep
// appears to be torn from the page. Use at most 2–3 per page.
const EDGE =
  "M0 0H1440V22C1418 25 1404 19 1384 23C1361 28 1349 20 1326 24C1302 29 1291 22 1268 26C1247 30 1229 21 1206 25C1186 29 1170 24 1150 27C1124 31 1112 22 1088 25C1066 28 1051 23 1029 27C1004 32 990 23 968 26C946 29 930 24 909 28C885 32 873 22 850 25C829 28 812 24 790 28C767 32 752 22 730 25C709 28 692 23 670 27C646 31 633 23 611 26C590 29 573 25 551 28C528 32 512 23 491 26C469 29 455 24 432 28C408 32 395 23 373 26C352 29 335 24 313 28C290 32 276 22 254 25C232 28 216 23 194 27C171 31 156 23 134 26C113 29 97 24 75 28C52 32 38 22 18 25C11 26 6 25 0 24V0Z";

export function DeckledDivider({ direction = "down", className }: DeckledDividerProps) {
  return (
    <div aria-hidden="true" className={cn("pointer-events-none relative h-6 w-full overflow-hidden text-paper-deep sm:h-8", className)}>
      <svg
        viewBox="0 0 1440 32"
        preserveAspectRatio="none"
        className={cn("absolute inset-0 size-full", direction === "up" && "rotate-180")}
        fill="currentColor"
      >
        <path d={EDGE} />
      </svg>
    </div>
  );
}
