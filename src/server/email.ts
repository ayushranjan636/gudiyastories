import "server-only";
import { SITE } from "@/config/site";

/** Sends a plain transactional email through Resend. No-op when Resend is not configured. */
export async function sendEmail({ to, subject, text, html }: { to: string; subject: string; text: string; html?: string }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from || !to) return { sent: false as const };
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(key);
    const res = await resend.emails.send({ from, to, subject, text, html: html ?? undefined });
    if (res.error) console.error("[email] not sent:", subject, res.error.message);
    return { sent: !res.error };
  } catch (err) {
    console.error("[email] failed", err);
    return { sent: false as const };
  }
}

export function hasEmail() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

/** Where new-order notices go: OWNER_NOTIFICATION_EMAIL, or the shop's public email. */
export function ownerEmail() {
  return process.env.OWNER_NOTIFICATION_EMAIL?.trim() || SITE.email;
}
