import Link from "next/link";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/admin";
import { Badge, Empty, PageHeader, Tabs } from "@/components/admin/ui";
import { formatINR } from "@/lib/money";
import { LeadControls } from "./lead-controls";
import { daysAgo } from "@/features/orders/leads";

export const metadata = { title: "Leads" };

const TABS = ["open", "CONTACTED", "CONVERTED", "LOST", "all"] as const;
const LABEL: Record<string, string> = { open: "To call", NEW: "New", CONTACTED: "Contacted", CONVERTED: "Converted", LOST: "Not interested", all: "All" };
const TONE: Record<string, "amber" | "ink" | "green" | "neutral"> = { NEW: "amber", CONTACTED: "ink", CONVERTED: "green", LOST: "neutral" };

const when = (d: Date) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(d);
const digits = (p: string) => p.replace(/\D/g, "").slice(-10);

/**
 * People who filled in checkout and pressed Pay, but didn't finish paying.
 * One row per person (by phone): their latest attempt, how many times they tried.
 * Anyone who later paid is shown as Converted automatically.
 */
export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const tab = (TABS as readonly string[]).includes(sp.tab ?? "") ? sp.tab! : "open";
  const q = sp.q?.trim().slice(0, 80);
  const since = daysAgo(90);

  // Expire stale attempts so the list is current.
  await db.order.updateMany({ where: { status: "PENDING_PAYMENT", expiresAt: { lt: new Date() } }, data: { status: "EXPIRED" } });

  const attempts = await db.order.findMany({
    where: {
      status: { in: ["PENDING_PAYMENT", "EXPIRED"] },
      channel: "WEBSITE",
      createdAt: { gte: since },
      ...(q ? { OR: [{ contactName: { contains: q, mode: "insensitive" } }, { contactPhone: { contains: q.replace(/\D/g, "") || q } }, { contactEmail: { contains: q, mode: "insensitive" } }, { number: { contains: q, mode: "insensitive" } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { items: { select: { title: true, quantity: true } } },
    take: 500,
  });
  // People who went on to pay (same phone), so their old attempts count as converted.
  const paidPhones = new Set(
    (
      await db.order.findMany({
        where: { contactPhone: { in: [...new Set(attempts.map((a) => a.contactPhone))] }, paidAt: { not: null } },
        select: { contactPhone: true, paidAt: true, number: true },
      })
    ).map((o) => digits(o.contactPhone)),
  );

  type Lead = (typeof attempts)[number] & { tries: number; leadState: string; paidLater: boolean };
  const byPerson = new Map<string, Lead>();
  for (const a of attempts) {
    const key = digits(a.contactPhone);
    const cur = byPerson.get(key);
    if (cur) {
      cur.tries++;
      continue;
    }
    const paidLater = paidPhones.has(key);
    byPerson.set(key, { ...a, tries: 1, paidLater, leadState: paidLater ? "CONVERTED" : (a.leadStatus ?? "NEW") });
  }
  const leads = [...byPerson.values()];
  const count = (t: string) => leads.filter((l) => (t === "all" ? true : t === "open" ? l.leadState === "NEW" : l.leadState === t)).length;
  const shown = leads.filter((l) => (tab === "all" ? true : tab === "open" ? l.leadState === "NEW" : l.leadState === tab));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description="People who filled in checkout and pressed Pay but didn't finish paying, in the last 90 days. Call or message them to help them complete the order."
      />
      <Tabs active={`/admin/leads?tab=${tab}`} items={TABS.map((t) => ({ href: `/admin/leads?tab=${t}`, label: LABEL[t]!, count: count(t) }))} />
      <form className="flex max-w-md gap-2">
        <input type="hidden" name="tab" value={tab} />
        <input name="q" defaultValue={q} placeholder="Name, phone or email" aria-label="Search leads" className="h-10 flex-1 rounded-lg border border-line bg-white px-3 text-small" />
        <button className="h-10 rounded-lg border border-line px-4 text-small">Search</button>
      </form>

      {shown.length ? (
        <ul className="grid gap-4 lg:grid-cols-2">
          {shown.map((l) => {
            const phone10 = digits(l.contactPhone);
            const first = l.contactName.split(" ")[0] ?? "";
            const books = l.items.map((i) => `${i.quantity} × ${i.title}`).join(", ");
            const wa = `https://wa.me/91${phone10}?text=${encodeURIComponent(`Hello ${first}, this is Gudiya Stories. We saw you were ordering ${books} on our website. Can we help you complete the order?`)}`;
            return (
              <li key={l.id} className="rounded-2xl border border-line bg-white/70 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{l.contactName}</p>
                    <p className="text-small text-ink-soft">
                      {l.shipCity}, {l.shipState} · {when(l.createdAt)}
                      {l.tries > 1 ? ` · tried ${l.tries} times` : ""}
                    </p>
                  </div>
                  <Badge tone={TONE[l.leadState] ?? "neutral"}>{l.paidLater ? "Ordered later" : LABEL[l.leadState]}</Badge>
                </div>
                <p className="mt-3 text-small">
                  {books} · <span className="font-medium tabular-nums">{formatINR(l.totalPaise)}</span>
                  {l.couponCode ? <span className="text-ink-soft"> · code {l.couponCode}</span> : null}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-small">
                  <a href={`tel:+91${phone10}`} className="rounded-full bg-ink px-4 py-1.5 font-medium text-paper">Call {l.contactPhone}</a>
                  <a href={wa} target="_blank" rel="noopener noreferrer" className="rounded-full border border-line px-4 py-1.5 font-medium">WhatsApp</a>
                  {l.contactEmail ? <a href={`mailto:${l.contactEmail}`} className="rounded-full border border-line px-4 py-1.5">{l.contactEmail}</a> : null}
                  <Link href={`/admin/orders/${l.id}`} className="rounded-full px-3 py-1.5 text-ink-soft underline underline-offset-2">{l.number}</Link>
                </div>
                {l.paidLater ? null : <LeadControls orderId={l.id} status={l.leadState} note={l.leadNote ?? ""} />}
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty>{tab === "open" ? "No one to call right now." : "Nothing here."}</Empty>
      )}
    </div>
  );
}
