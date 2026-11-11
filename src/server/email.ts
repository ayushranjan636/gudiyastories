import "server-only";
import { SITE } from "@/config/site";

export type Attachment = { filename: string; content: Uint8Array; contentType?: string };

/**
 * Sends a transactional email.
 *   EMAIL_PROVIDER="ses"     Amazon SES (the live server: its IAM role sends, no keys needed)
 *   EMAIL_PROVIDER="resend"  Resend (needs RESEND_API_KEY)
 *   unset                    SES if EMAIL_FROM is set and no Resend key; otherwise off.
 * No-op (returns sent: false) when email isn't set up.
 */
export function emailProvider(): "ses" | "resend" | null {
  const p = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (!process.env.EMAIL_FROM) return null;
  if (p === "ses") return "ses";
  if (p === "resend") return process.env.RESEND_API_KEY ? "resend" : null;
  return process.env.RESEND_API_KEY ? "resend" : null;
}

export async function sendEmail({ to, subject, text, html, attachments }: { to: string; subject: string; text: string; html?: string; attachments?: Attachment[] }) {
  const from = process.env.EMAIL_FROM;
  const provider = emailProvider();
  if (!provider || !from || !to) return { sent: false as const };
  // Customer replies go to the shop inbox (Zoho), not to the sending address.
  const replyTo = process.env.EMAIL_REPLY_TO?.trim() || SITE.email;
  try {
    if (provider === "ses") {
      const { sesSend } = await import("./email-ses");
      const r = await sesSend({ from, to, replyTo, subject, text, html, attachments });
      if (!r.sent) console.error("[email] SES refused:", subject, "→", to, r.error);
      return { sent: r.sent };
    }
    const { Resend } = await import("resend");
    const res = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from,
      to,
      subject,
      text,
      html: html ?? undefined,
      replyTo,
      attachments: attachments?.map((a) => ({ filename: a.filename, content: Buffer.from(a.content), contentType: a.contentType })),
    });
    if (res.error) console.error("[email] not sent:", subject, res.error.message);
    return { sent: !res.error };
  } catch (err) {
    console.error("[email] failed", err);
    return { sent: false as const };
  }
}

export function hasEmail() {
  return emailProvider() !== null;
}

/** Where new-order notices go: OWNER_NOTIFICATION_EMAIL, or the shop's public email. */
export function ownerEmail() {
  return process.env.OWNER_NOTIFICATION_EMAIL?.trim() || SITE.email;
}
