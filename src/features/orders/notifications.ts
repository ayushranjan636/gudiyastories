import "server-only";
import { db } from "@/server/db";
import { sendEmail } from "@/server/email";
import { formatINR } from "@/lib/money";
import { SITE } from "@/config/site";
import { orderLinks } from "./token";

/**
 * Emails the customer as their order moves along: packed → shipped → delivered,
 * or cancelled / refunded. Each email is sent at most once per order (refunds:
 * once per refund) and every attempt is written to the order's timeline in Admin.
 * A failed send never blocks the admin action that triggered it.
 */

export type StatusEmail =
  | { kind: "packed" }
  | { kind: "shipped"; courier: string; trackingNumber: string; trackingUrl?: string | null }
  | { kind: "delivered"; reviewUrl?: string | null }
  | { kind: "cancelled"; reason?: string | null; refundDue: boolean }
  | { kind: "refunded"; refundKey: string; amountPaise: number; full: boolean };

const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The shared look of every Gudiya Stories email (inline styles: email apps ignore stylesheets). */
export function emailShell(p: {
  eyebrow: string;
  heading: string;
  paragraphs: string[];
  facts?: [string, string][];
  button?: { label: string; url: string };
  link?: { label: string; url: string };
}) {
  const facts = p.facts?.length
    ? `<tr><td style="padding:8px 28px 4px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">${p.facts
        .map(([a, b]) => `<tr><td style="padding:6px 0;border-bottom:1px solid #F2EBDD;color:#5A5650">${esc(a)}</td><td align="right" style="padding:6px 0;border-bottom:1px solid #F2EBDD">${esc(b)}</td></tr>`)
        .join("")}</table></td></tr>`
    : "";
  const actions =
    p.button || p.link
      ? `<tr><td style="padding:16px 28px 28px">${p.button ? `<a href="${esc(p.button.url)}" style="display:inline-block;background:#2F6B2A;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-size:14px">${esc(p.button.label)}</a>` : ""}${
          p.link ? `<a href="${esc(p.link.url)}" style="display:inline-block;margin-left:${p.button ? "10px" : "0"};color:#2F6B2A;font-size:14px">${esc(p.link.label)}</a>` : ""
        }</td></tr>`
      : `<tr><td style="padding:0 0 20px"></td></tr>`;
  return `<!doctype html><html><body style="margin:0;background:#FBF8F1;font-family:Helvetica,Arial,sans-serif;color:#1B1A17">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border:1px solid #E4DCCB;border-radius:16px" cellpadding="0" cellspacing="0">
<tr><td style="padding:28px 28px 8px"><p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#2F6B2A;font-weight:bold">${esc(p.eyebrow)}</p>
<h1 style="margin:8px 0 0;font-family:Georgia,serif;font-weight:normal;font-size:26px">${esc(p.heading)}</h1>
${p.paragraphs.map((t) => `<p style="margin:10px 0 0;color:#5A5650;font-size:15px;line-height:1.5">${esc(t)}</p>`).join("")}</td></tr>
${facts}${actions}
</table><p style="font-size:12px;color:#5A5650;margin:16px 0 0">Gudiya Stories · Tirupati, Andhra Pradesh · ${esc(SITE.phoneDisplay)} · Reply to this email to reach us.</p>
</td></tr></table></body></html>`;
}

const LABEL: Record<StatusEmail["kind"], string> = {
  packed: "packed",
  shipped: "on its way",
  delivered: "delivered",
  cancelled: "cancelled",
  refunded: "refund issued",
};

export async function sendStatusEmail(orderId: string, e: StatusEmail): Promise<"sent" | "skipped" | "failed"> {
  try {
    const o = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!o?.contactEmail) return "skipped";
    // Unpaid checkout attempts never get emails, not even "cancelled".
    if (!o.paidAt && o.paymentMethod === "RAZORPAY") return "skipped";

    const marker = `Customer emailed: ${LABEL[e.kind]}${e.kind === "refunded" ? ` (${e.refundKey})` : ""}`;
    if (await db.orderEvent.findFirst({ where: { orderId, message: marker }, select: { id: true } })) return "skipped";

    const first = o.contactName.split(" ")[0] || "there";
    const links = orderLinks(o.number, SITE.url.replace(/\/$/, ""));
    const books = o.items.map((i) => `${i.quantity} × ${i.title}`).join(", ");
    const track = { label: "Track your order", url: links.page };

    let subject: string;
    let html: string;
    let text: string[];

    switch (e.kind) {
      case "packed":
        subject = `Your order ${o.number} is packed`;
        text = [`Hello ${first},`, "", `Your order ${o.number} (${books}) is packed and will be handed to the courier shortly. You'll get the tracking number in the next email.`];
        html = emailShell({ eyebrow: "Packed", heading: `It's packed, ${first}.`, paragraphs: [`Your books are wrapped and ready in Tirupati. They'll be handed to the courier shortly, and you'll get the tracking number in the next email.`], facts: [["Order", o.number], ["Books", books]], button: track });
        break;
      case "shipped":
        subject = `Your order ${o.number} is on its way`;
        text = [`Hello ${first},`, "", `Your books have left Tirupati with ${e.courier}.`, `Tracking number: ${e.trackingNumber}`, ...(e.trackingUrl ? [`Track with the courier: ${e.trackingUrl}`] : [])];
        html = emailShell({
          eyebrow: "On its way",
          heading: "Your books are on their way.",
          paragraphs: [`They've left Tirupati with ${e.courier}. Delivery usually takes 3–7 days, depending on your PIN code.`],
          facts: [["Order", o.number], ["Courier", e.courier], ["Tracking number", e.trackingNumber]],
          button: e.trackingUrl ? { label: "Track with the courier", url: e.trackingUrl } : track,
          link: e.trackingUrl ? { label: "Order status", url: links.page } : undefined,
        });
        break;
      case "delivered":
        subject = `Your order ${o.number} was delivered`;
        text = [`Hello ${first},`, "", `Your Gudiya Stories order ${o.number} was delivered. We hope the stories find a place at bedtime.`, ...(e.reviewUrl ? ["", `Once you've read them together, tell us what your child made of the books (it takes a minute): ${e.reviewUrl}`] : []), "", "If anything arrived damaged or wrong, reply to this email within 7 days with a photo and we'll put it right."];
        html = emailShell({
          eyebrow: "Delivered",
          heading: "Your books have arrived.",
          paragraphs: [
            "We hope the stories find a place at bedtime.",
            ...(e.reviewUrl ? ["Once you've read them together, we'd love to hear what your child made of them. It takes a minute."] : []),
            "If anything arrived damaged or wrong, reply to this email within 7 days with a photo and we'll put it right.",
          ],
          facts: [["Order", o.number], ["Books", books]],
          button: e.reviewUrl ? { label: "Review the books", url: e.reviewUrl } : track,
        });
        break;
      case "cancelled":
        subject = `Your order ${o.number} was cancelled`;
        text = [`Hello ${first},`, "", `Your order ${o.number} has been cancelled${e.reason ? `: ${e.reason}` : "."}`, ...(e.refundDue ? ["", `Your payment of ${formatINR(o.totalPaise)} will be refunded to the original payment method. Banks usually take 5 to 7 working days to show it.`] : [])];
        html = emailShell({
          eyebrow: "Order cancelled",
          heading: "Your order was cancelled.",
          paragraphs: [
            e.reason ? `Reason: ${e.reason}` : "If you didn't expect this, reply to this email and we'll help.",
            ...(e.refundDue ? [`Your payment of ${formatINR(o.totalPaise)} will be refunded to the original payment method. Banks usually take 5 to 7 working days to show it.`] : []),
          ],
          facts: [["Order", o.number], ["Books", books]],
          link: { label: "Order details", url: links.page },
        });
        break;
      case "refunded":
        subject = `Refund for order ${o.number}: ${formatINR(e.amountPaise)}`;
        text = [`Hello ${first},`, "", `We've refunded ${formatINR(e.amountPaise)} for order ${o.number}${e.full ? "" : " (part of the order)"}. It goes back to the original payment method; banks usually take 5 to 7 working days to show it.`];
        html = emailShell({
          eyebrow: "Refund issued",
          heading: `${formatINR(e.amountPaise)} is on its way back.`,
          paragraphs: [`It goes back to the payment method you used${e.full ? "" : ", for part of the order"}. Banks usually take 5 to 7 working days to show it.`],
          facts: [["Order", o.number], ["Refund", formatINR(e.amountPaise)]],
          link: { label: "Order details", url: links.page },
        });
        break;
    }

    const plain = [...text, "", `Order status: ${links.page}`, "", "Gudiya Stories, Tirupati", "Reply to this email to reach us."].join("\n");
    const r = await sendEmail({ to: o.contactEmail, subject, text: plain, html });
    await db.orderEvent.create({ data: { orderId, message: r.sent ? marker : `Email to customer not sent: ${LABEL[e.kind]} (email service not set up or refused)` } });
    return r.sent ? "sent" : "failed";
  } catch (err) {
    console.error("[email] status", orderId, e.kind, err);
    return "failed";
  }
}
