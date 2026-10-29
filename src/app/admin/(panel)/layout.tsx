import type { Metadata } from "next";
import { requireAdmin } from "@/server/admin";
import { db } from "@/server/db";
import { AdminNav } from "./admin-nav";
import { credentialsStatus } from "@/features/payments/credentials";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const [toPack, newEnquiries, pendingReviews] = await Promise.all([
    db.order.count({ where: { status: "PAID" } }),
    db.enquiry.count({ where: { stage: "NEW" } }),
    db.review.count({ where: { status: "PENDING" } }),
  ]);
  const status = await credentialsStatus();
  const banner = status.rejectedEnvKeyId
    ? `The Razorpay key in the server's .env (${status.rejectedEnvKeyId.slice(0, 13)}…) is not used: the live site only accepts live keys (rzp_live_…). Online payment is off until live keys are added.`
    : status.partialEnv
      ? "Razorpay is only half set up in the server's .env (Key ID or Key Secret is missing), so it is not used."
      : status.unreadable
        ? "The saved Razorpay keys can't be read (the server's AUTH_SECRET changed). Enter them again in Settings → Online payments."
        : status.rejectedStored
          ? "The saved Razorpay keys are test keys, which the live site doesn't accept. Enter live keys in Settings → Online payments."
          : !status.configured
            ? "Online payment is off: checkout offers cash on delivery and WhatsApp only. Add your Razorpay keys in Settings → Online payments."
            : status.kind === "test"
              ? "Payments: Razorpay test keys (this computer only). Nothing is charged. The live site needs live keys (rzp_live_…)."
              : null;
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
      <AdminNav admin={{ name: admin.name, role: admin.role }} counts={{ toPack, newEnquiries, pendingReviews }} />
      <main id="main" className="min-w-0 px-5 py-8 lg:px-10">
        {banner ? <p className="mb-6 rounded-lg border border-[#F2B91E]/60 bg-[#F2B91E]/15 px-4 py-2.5 text-small">{banner}</p> : null}
        {children}
      </main>
    </div>
  );
}
