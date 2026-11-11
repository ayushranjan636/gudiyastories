import { z } from "zod";

/**
 * Sends a test email through the live email setup (SES on the server), with a
 * sample invoice attached, to check everything works end to end.
 * POST {"to":"you@example.com"} with Authorization: Bearer CRON_SECRET
 */
export async function POST(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const p = z.object({ to: z.string().trim().email().max(200) }).safeParse(await req.json().catch(() => null));
  if (!p.success) return Response.json({ ok: false, error: "Send {\"to\": \"email\"}" }, { status: 400 });

  const { sendEmail, emailProvider } = await import("@/server/email");
  const { emailShell } = await import("@/features/orders/notifications");
  const { SITE } = await import("@/config/site");
  const provider = emailProvider();
  if (!provider) return Response.json({ ok: false, error: "Email is off: EMAIL_PROVIDER / EMAIL_FROM not set." }, { status: 503 });

  const html = emailShell({
    eyebrow: "Test email",
    heading: "Order emails are working.",
    paragraphs: [
      `This test was sent from ${SITE.url.replace(/^https?:\/\//, "")} through ${provider === "ses" ? "Amazon SES" : "Resend"}.`,
      "Customers now get an email when their order is confirmed (with the invoice PDF attached), packed, shipped, delivered, cancelled or refunded.",
    ],
    facts: [["From", process.env.EMAIL_FROM ?? ""], ["Replies go to", process.env.EMAIL_REPLY_TO || SITE.email]],
    button: { label: "Visit the shop", url: SITE.url },
  });
  const r = await sendEmail({
    to: p.data.to,
    subject: "Gudiya Stories: test email",
    text: "Order emails are working. This test was sent from gudiyastories.com.",
    html,
  });
  return Response.json({ ok: r.sent, provider, to: p.data.to }, { status: r.sent ? 200 : 502 });
}
