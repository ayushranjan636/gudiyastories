import { cn } from "@/lib/cn";

/**
 * The logo's triple-line (inline) lettering, rebuilt as live SVG text:
 * alternating lime and paper strokes stacked from thick to thin leave
 * concentric lines around each letter, the same way the logo is drawn.
 * Used large in the footer, where the PNG wordmark cannot be cut cleanly.
 */
export function InlineWordmark({
  text = "GUDIYA STORIES",
  className,
  ink = "var(--lime)",
  ground = "var(--paper-deep)",
}: {
  text?: string;
  className?: string;
  ink?: string;
  ground?: string;
}) {
  // Lime core, then alternating rings: three lime lines per letter stroke.
  const layers = [
    { stroke: ink, w: 15, fill: "none" },
    { stroke: ground, w: 10.4, fill: "none" },
    { stroke: ink, w: 6, fill: ink },
    { stroke: ground, w: 2.2, fill: "none" },
  ];
  const common = {
    x: 4,
    y: 94,
    textLength: 992,
    lengthAdjust: "spacingAndGlyphs" as const,
    style: { fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 108, letterSpacing: "0.02em" },
  };
  return (
    <svg viewBox="0 0 1000 112" className={cn("block w-full", className)} role="img" aria-label="Gudiya Stories">
      {layers.map((l, i) => (
        <text key={i} {...common} fill={l.fill} stroke={l.stroke} strokeWidth={l.w} strokeLinejoin="round" aria-hidden="true">
          {text}
        </text>
      ))}
    </svg>
  );
}
