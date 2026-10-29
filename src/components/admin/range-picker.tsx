import Link from "next/link";
import { cn } from "@/lib/cn";

export function RangePicker({ base, active, options }: { base: string; active: string; options: { key: string; label: string }[] }) {
  return (
    <nav aria-label="Date range" className="flex flex-wrap gap-1 rounded-full border border-line bg-white/70 p-1">
      {options.map((o) => (
        <Link
          key={o.key}
          href={`${base}?range=${o.key}` as "/admin"}
          aria-current={o.key === active ? "true" : undefined}
          className={cn("rounded-full px-3 py-1.5 text-small", o.key === active ? "bg-ink text-paper" : "hover:bg-paper-deep")}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}
