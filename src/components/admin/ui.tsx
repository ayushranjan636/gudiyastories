import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-h3">{title}</h1>
        {description ? <p className="mt-1 text-small text-ink-soft">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Card({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-line bg-white/70 p-5", className)}>
      {title ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-sans text-small font-semibold">{title}</h2>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Stat({ label, value, delta, hint }: { label: string; value: ReactNode; delta?: number | null; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white/70 p-5">
      <p className="text-small text-ink-soft">{label}</p>
      <p className="mt-2 font-display text-h3 tabular-nums">{value}</p>
      {delta != null && Number.isFinite(delta) ? (
        <p className={cn("mt-1 text-small tabular-nums", delta >= 0 ? "text-leaf" : "text-clay")}>
          {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(0)}% <span className="text-ink-soft">vs previous period</span>
        </p>
      ) : hint ? (
        <p className="mt-1 text-small text-ink-soft">{hint}</p>
      ) : null}
    </div>
  );
}

const TONES = {
  neutral: "bg-paper-deep text-ink",
  green: "bg-leaf/10 text-leaf",
  lime: "bg-lime/25 text-ink",
  amber: "bg-[#F2B91E]/25 text-ink",
  red: "bg-clay/12 text-clay",
  ink: "bg-ink text-paper",
};

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: keyof typeof TONES }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.75rem] font-medium whitespace-nowrap", TONES[tone])}>{children}</span>;
}

export const ORDER_TONE: Record<string, keyof typeof TONES> = {
  PENDING_PAYMENT: "amber",
  PAID: "lime",
  PACKED: "green",
  SHIPPED: "green",
  DELIVERED: "neutral",
  CANCELLED: "red",
  RETURNED: "red",
  REFUNDED: "red",
  EXPIRED: "neutral",
};

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-2xl border border-line bg-white/70", className)}>
      <table className="w-full min-w-[640px] border-collapse text-small [&_td]:border-t [&_td]:border-line [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:font-medium [&_th]:text-ink-soft [&_tbody_tr:hover]:bg-paper/80">
        {children}
      </table>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-line px-6 py-10 text-center text-ink-soft">{children}</p>;
}

export function Tabs({ items, active }: { items: { href: string; label: string; count?: number }[]; active: string }) {
  return (
    <nav className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1">
      {items.map((t) => (
        <Link
          key={t.href}
          href={t.href as "/admin"}
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-small transition-colors",
            active === t.href ? "bg-ink text-paper" : "hover:bg-paper-deep",
          )}
        >
          {t.label}
          {t.count != null ? <span className={cn("tabular-nums", active === t.href ? "text-paper/70" : "text-ink-soft")}>{t.count}</span> : null}
        </Link>
      ))}
    </nav>
  );
}

export const inputCls =
  "h-10 w-full rounded-lg border border-line bg-white px-3 text-small focus:border-leaf focus:ring-2 focus:ring-leaf/20 focus:outline-none";
export const labelCls = "flex flex-col gap-1.5 text-small font-medium";
export const btn = {
  primary: "inline-flex h-10 items-center justify-center gap-2 rounded-full bg-leaf px-4 text-small font-medium text-white hover:bg-leaf-deep disabled:opacity-50",
  secondary: "inline-flex h-10 items-center justify-center gap-2 rounded-full border border-ink/70 px-4 text-small font-medium hover:bg-paper-deep disabled:opacity-50",
  quiet: "inline-flex h-9 items-center justify-center gap-2 rounded-full px-3 text-small hover:bg-paper-deep",
  danger: "inline-flex h-10 items-center justify-center gap-2 rounded-full border border-clay/60 px-4 text-small font-medium text-clay hover:bg-clay/10 disabled:opacity-50",
};
