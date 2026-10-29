import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/admin";
import { btn, Card } from "@/components/admin/ui";
import { formatDate } from "@/lib/format";
import { EnquiryUpdate } from "./enquiry-update";

export default async function EnquiryDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const e = await db.enquiry.findUnique({ where: { id }, include: { notes: { orderBy: { createdAt: "desc" }, include: { adminUser: { select: { name: true } } } }, order: true } });
  if (!e) notFound();
  const wants = [e.wantsSamplePack && "sample pack", e.wantsBookplate && "bookplate", e.wantsAuthorVisit && "author session"].filter(Boolean);
  const wa = `https://wa.me/${e.contactPhone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello ${e.contactName.split(" ")[0]}, thank you for your enquiry about books for ${e.organisation}.`)}`;
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/admin/enquiries" className="text-small text-ink-soft hover:text-ink">← Enquiries</Link>
          <h1 className="mt-2 text-h3">{e.organisation}</h1>
          <p className="text-small text-ink-soft">{e.organisationType.replace("_", " ").toLowerCase()} · {e.city} · received {formatDate(e.createdAt)}</p>
        </div>
        <div className="flex gap-2">
          <a href={wa} target="_blank" rel="noopener noreferrer" className={btn.secondary}><MessageCircle className="size-4" strokeWidth={1.5} aria-hidden="true" /> WhatsApp</a>
          <a href={`mailto:${e.contactEmail}?subject=${encodeURIComponent(`Books for ${e.organisation}`)}`} className={btn.secondary}>Email</a>
          <Link href="/admin/orders/new" className={btn.primary}>Turn into an order</Link>
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card title="What they asked for">
            <dl className="grid gap-x-6 gap-y-3 text-small sm:grid-cols-2">
              <div><dt className="text-ink-soft">Copies</dt><dd className="font-medium">{e.quantity}</dd></div>
              <div><dt className="text-ink-soft">Timeline</dt><dd>{e.timeline ?? "–"}</dd></div>
              <div><dt className="text-ink-soft">Budget</dt><dd>{e.budget ?? "–"}</dd></div>
              <div><dt className="text-ink-soft">Also wants</dt><dd>{wants.length ? wants.join(", ") : "–"}</dd></div>
              <div className="sm:col-span-2"><dt className="text-ink-soft">Titles</dt><dd>{e.titles.length ? e.titles.join(", ") : "Not chosen yet"}</dd></div>
              {e.message ? <div className="sm:col-span-2"><dt className="text-ink-soft">Message</dt><dd className="whitespace-pre-line">{e.message}</dd></div> : null}
            </dl>
          </Card>
          <Card title="Notes">
            {e.notes.length ? (
              <ul className="space-y-3">
                {e.notes.map((n) => (
                  <li key={n.id} className="rounded-lg bg-paper p-3 text-small">
                    <p className="whitespace-pre-line">{n.body}</p>
                    <p className="mt-1 text-ink-soft">{formatDate(n.createdAt)}{n.adminUser ? ` · ${n.adminUser.name}` : ""}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-small text-ink-soft">No notes yet.</p>
            )}
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="Contact">
            <p className="font-medium">{e.contactName}</p>
            <p className="text-small"><a className="underline" href={`tel:${e.contactPhone}`}>{e.contactPhone}</a></p>
            <p className="text-small break-all"><a className="underline" href={`mailto:${e.contactEmail}`}>{e.contactEmail}</a></p>
          </Card>
          <EnquiryUpdate id={e.id} stage={e.stage} followUp={e.nextFollowUpOn ? e.nextFollowUpOn.toISOString().slice(0, 10) : ""} />
        </div>
      </div>
    </div>
  );
}
