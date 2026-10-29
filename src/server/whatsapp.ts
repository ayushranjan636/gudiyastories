import "server-only";

/**
 * Optional automatic WhatsApp messages through Meta's WhatsApp Cloud API.
 * Set WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ORDER_TEMPLATE
 * (an approved template with 3 body variables: name, order number, total).
 * Without them this does nothing, and the order page offers a WhatsApp button instead.
 */
export function hasWhatsAppApi() {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ORDER_TEMPLATE);
}

export async function sendOrderWhatsApp(toE164: string, params: [string, string, string]) {
  if (!hasWhatsAppApi()) return { sent: false as const };
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toE164.replace(/\D/g, ""),
        type: "template",
        template: {
          name: process.env.WHATSAPP_ORDER_TEMPLATE,
          language: { code: process.env.WHATSAPP_TEMPLATE_LANG ?? "en" },
          components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }],
        },
      }),
    });
    return { sent: res.ok };
  } catch (err) {
    console.error("[whatsapp] failed", err);
    return { sent: false as const };
  }
}
