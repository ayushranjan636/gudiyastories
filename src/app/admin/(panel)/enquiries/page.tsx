import Link from "next/link";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/admin";
import { Badge, PageHeader } from "@/components/admin/ui";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Bulk enquiries" };

const STAGES = [
  { key: "NEW", label: "New" },
  { key: "CONTACTED", label: "Contacted" },
  { key: "SAMPLE_SENT", label: "Sample sent" },
  { key: "QUOTED", label: "Quoted" },
  { key: "WON", label: "Won" },
  { key: "LOST", label: "Lost" },
] as const;

export default async function EnquiriesPage() {
  await requireAdmin();
  const all = await db.enquiry.findMany({ orderBy: { createdAt: "desc" }, take: 300 });
  const today = new Date();
  return (
    <div className="space-y-6">
      <PageHeader title="Bulk enquiries" description="Schools, libraries, NGOs and CSR programmes, from first message to order." />
      <div className="no-scrollbar -mx-5 overflow-x-auto px-5 lg:-mx-10 lg:px-10">
        <div className="grid min-w-[1100px] grid-cols-6 gap-3">
          {STAGES.map((s) => {
            const items = all.filter((e) => e.stage === s.key);
            return (
              <section key={s.key} aria-labelledby={`stage-${s.key}`} className="rounded-2xl bg-paper-deep/70 p-3">
                <h2 id={`stage-${s.key}`} className="flex items-center justify-between px-1 pb-2 font-sans text-small font-semibold">
                  {s.label} <span className="font-normal text-ink-soft tabular-nums">{items.length}</span>
                </h2>
                <ul className="space-y-2">
                  {items.map((e) => {
                    const due = e.nextFollowUpOn && e.nextFollowUpOn <= today && !["WON", "LOST"].includes(e.stage);
                    return (
                      <li key={e.id}>
                        <Link href={`/admin/enquiries/${e.id}`} className="block rounded-xl border border-line bg-white p-3 text-small transition-shadow hover:shadow-sm">
                          <span className="block font-medium">{e.organisation}</span>
                          <span className="block text-ink-soft">{e.quantity} copies · {e.city}</span>
                          <span className="mt-2 flex flex-wrap gap-1">
                            <Badge>{e.organisationType.replace("_", " ").toLowerCase()}</Badge>
                            {due ? <Badge tone="red">follow up</Badge> : e.nextFollowUpOn ? <Badge tone="neutral">{formatDate(e.nextFollowUpOn)}</Badge> : null}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
