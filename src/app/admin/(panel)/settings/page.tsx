import { db } from "@/server/db";
import { requireAdmin } from "@/server/admin";
import { PageHeader } from "@/components/admin/ui";
import { formatDate } from "@/lib/format";
import { SettingsForms } from "./settings-forms";
import { credentialsStatus } from "@/features/payments/credentials";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const admin = await requireAdmin("OWNER");
  const [rows, users, log, payments] = await Promise.all([
    db.setting.findMany({ where: { key: { not: "razorpay" } } }),
    db.adminUser.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true, email: true, role: true, active: true, lastLoginAt: true } }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 25, include: { adminUser: { select: { name: true } } } }),
    credentialsStatus(),
  ]);
  const s = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, Record<string, unknown>>;
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Online payments, store details, delivery, bulk pricing, bills and who can sign in." />
      <SettingsForms
        selfId={admin.id}
        payments={{
          configured: payments.configured,
          source: payments.source,
          keyId: payments.keyId,
          kind: payments.kind,
          webhook: payments.webhook,
          savedAt: payments.savedAt ? formatDate(new Date(payments.savedAt)) : null,
          webhookUrl: `${site || "https://your-domain"}/api/razorpay/webhook`,
          liveOnly: process.env.NODE_ENV === "production",
        }}
        store={s.store ?? {}}
        shipping={s.shipping ?? {}}
        bulkTiers={(s.bulkTiers as unknown as { minQuantity: number; discountPercent: number | null }[]) ?? []}
        invoice={s.invoice ?? {}}
        social={s.social ?? {}}
        users={users.map((u) => ({ ...u, lastLoginAt: u.lastLoginAt ? formatDate(u.lastLoginAt) : null }))}
        log={log.map((l) => ({ id: l.id, at: formatDate(l.createdAt), who: l.adminUser?.name ?? "system", what: `${l.action.toLowerCase()} ${l.entity}` }))}
      />
    </div>
  );
}
