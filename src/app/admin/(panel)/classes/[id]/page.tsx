import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/admin";
import { ClassForm } from "./class-form";

export const metadata = { title: "Edit class" };

export default async function EditClass({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const isNew = id === "new";
  const c = isNew ? null : await db.onlineClass.findUnique({ where: { id } });
  if (!isNew && !c) notFound();
  const popupElsewhere = await db.onlineClass.findFirst({ where: { isPopup: true, NOT: c ? { id: c.id } : undefined }, select: { title: true } });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/classes" className="text-small text-ink-soft hover:text-ink">← Classes</Link>
        <h1 className="mt-2 text-h3">{isNew ? "New class" : c!.title}</h1>
      </div>
      <ClassForm
        id={c?.id ?? null}
        canDelete={admin.role === "OWNER"}
        popupElsewhere={popupElsewhere?.title ?? null}
        initial={{
          title: c?.title ?? "",
          slug: c?.slug ?? "",
          summary: c?.summary ?? "",
          aboutHtml: c?.aboutHtml ?? "",
          topics: c?.topics ?? [],
          audience: c?.audience ?? "",
          mode: c?.mode ?? "Live online",
          schedule: c?.schedule ?? "",
          startDate: c?.startDate ? c.startDate.toISOString().slice(0, 10) : "",
          duration: c?.duration ?? "",
          priceRupees: c?.pricePaise != null ? String(c.pricePaise / 100) : "",
          priceNote: c?.priceNote ?? "",
          enquiryUrl: c?.enquiryUrl ?? "",
          mediaKind: c?.mediaKind ?? null,
          mediaUrl: c?.mediaUrl ?? "",
          posterUrl: c?.posterUrl ?? "",
          mediaAlt: c?.mediaAlt ?? "",
          status: c?.status ?? "DRAFT",
          isPopup: c?.isPopup ?? false,
        }}
      />
    </div>
  );
}
