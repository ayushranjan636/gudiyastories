import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getRazorpayCredentials, keyKind, type RazorpayCredentials } from "./credentials";

/**
 * The only file that talks to the payment provider (Razorpay).
 *
 *  - "razorpay": Razorpay keys are set (in .env or Admin → Settings). Real payments.
 *  - "none":     no keys; checkout offers cash on delivery / WhatsApp only.
 *
 * Every payment is confirmed only after the server fetches it from Razorpay's
 * API and checks the order, amount, currency and status.
 */
export type GatewayMode = "razorpay" | "none";

export async function paymentMode(): Promise<GatewayMode> {
  return (await getRazorpayCredentials()) ? "razorpay" : "none";
}

async function creds(): Promise<RazorpayCredentials> {
  const c = await getRazorpayCredentials();
  if (!c) throw new Error("Online payment is not set up.");
  return c;
}

async function razorpay(c?: RazorpayCredentials) {
  const { keyId, keySecret } = c ?? (await creds());
  const Razorpay = (await import("razorpay")).default;
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export type GatewayOrder = { gatewayOrderId: string; keyId: string };

/** Creates the Razorpay order for exactly this amount, in paise. */
export async function createGatewayOrder(input: { amountPaise: number; receipt: string; orderId: string }): Promise<GatewayOrder> {
  if (!Number.isInteger(input.amountPaise) || input.amountPaise < 100) throw new Error("Amount must be at least ₹1.");
  const c = await creds();
  const rzp = await razorpay(c);
  // payment_capture: capture straight away, whatever the account-level setting is.
  const order = await rzp.orders.create({ amount: input.amountPaise, currency: "INR", receipt: input.receipt, payment_capture: true, notes: { orderId: input.orderId } });
  if (Number(order.amount) !== input.amountPaise) throw new Error("Payment provider returned a different amount.");
  // The Key ID is public (it goes to the browser); the secret never leaves the server.
  return { gatewayOrderId: order.id, keyId: c.keyId };
}

/** Razorpay's checkout signature: HMAC-SHA256(order_id|payment_id) with your key secret. */
export async function verifyCheckoutSignature(gatewayOrderId: string, paymentId: string, signature: string): Promise<boolean> {
  const c = await getRazorpayCredentials();
  if (!c) return false;
  const expected = Buffer.from(createHmac("sha256", c.keySecret).update(`${gatewayOrderId}|${paymentId}`).digest("hex"));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** "test" or "live", from the key in use. Shown in the admin. */
export async function razorpayKeyMode(): Promise<"test" | "live" | null> {
  const c = await getRazorpayCredentials();
  return c ? keyKind(c.keyId) : null;
}

/**
 * Checks a Key ID + Secret with Razorpay before they are saved, so a typo
 * doesn't silently switch online payment off.
 */
export async function testCredentials(keyId: string, keySecret: string): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const rzp = await razorpay({ keyId, keySecret, webhookSecret: null, source: "admin" });
    await rzp.orders.all({ count: 1 });
    return { ok: true };
  } catch (err) {
    const e = err as { statusCode?: number; error?: { description?: string }; message?: string };
    if (e?.statusCode === 401) return { ok: false, message: "Razorpay rejected these keys. Copy the Key ID and Key Secret again from Razorpay → Account & Settings → API Keys." };
    return { ok: false, message: `Could not reach Razorpay to check the keys: ${e?.error?.description ?? e?.message ?? "unknown error"}` };
  }
}

type RzpPayment = {
  id: string;
  order_id: string | null;
  amount: number | string;
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  method?: string;
  vpa?: string | null;
  bank?: string | null;
  wallet?: string | null;
  card?: { network?: string; last4?: string } | null;
  email?: string;
  contact?: string;
  error_description?: string | null;
  created_at?: number;
};

export type Settlement =
  | { state: "captured"; paymentId: string; amountPaise: number; instrument: string; raw: Record<string, unknown> }
  | { state: "mismatch"; paymentId: string; reason: string }
  | { state: "failed"; paymentId: string | null; reason: string }
  | { state: "pending" };

function describe(p: RzpPayment) {
  if (p.method === "upi") return p.vpa ? `UPI (${p.vpa})` : "UPI";
  if (p.method === "card") return p.card?.last4 ? `${p.card.network ?? "Card"} •••• ${p.card.last4}` : "Card";
  if (p.method === "netbanking") return p.bank ? `Netbanking (${p.bank})` : "Netbanking";
  if (p.method === "wallet") return p.wallet ? `Wallet (${p.wallet})` : "Wallet";
  return p.method ?? "online";
}

/** Only what we need to keep; never the customer's full card or contact details. */
function keep(p: RzpPayment) {
  return { id: p.id, order_id: p.order_id, amount: Number(p.amount), currency: p.currency, status: p.status, method: p.method ?? null, created_at: p.created_at ?? null };
}

/**
 * Asks Razorpay directly whether money for this order really arrived, so
 * nothing depends on the browser or on webhooks. Authorized payments are
 * captured here (otherwise Razorpay refunds them automatically after a few days).
 * Checks the order, amount and currency match before saying "captured".
 */
async function settle(p: RzpPayment, gatewayOrderId: string, amountPaise: number): Promise<Settlement> {
  if (p.order_id !== gatewayOrderId) return { state: "mismatch", paymentId: p.id, reason: `Payment ${p.id} belongs to a different Razorpay order.` };
  if (Number(p.amount) !== amountPaise || p.currency !== "INR") {
    return { state: "mismatch", paymentId: p.id, reason: `Payment ${p.id} was for ${p.currency} ${Number(p.amount) / 100}, not the order total of INR ${amountPaise / 100}.` };
  }
  if (p.status === "authorized") {
    const rzp = await razorpay();
    p = (await rzp.payments.capture(p.id, amountPaise, "INR")) as unknown as RzpPayment;
  }
  if (p.status === "captured") return { state: "captured", paymentId: p.id, amountPaise: Number(p.amount), instrument: describe(p), raw: keep(p) };
  if (p.status === "failed") return { state: "failed", paymentId: p.id, reason: p.error_description ?? "Payment failed" };
  return { state: "pending" };
}

/** After checkout: settle the one payment the browser told us about. */
export async function settlePayment(paymentId: string, gatewayOrderId: string, amountPaise: number): Promise<Settlement> {
  const rzp = await razorpay();
  const p = (await rzp.payments.fetch(paymentId)) as unknown as RzpPayment;
  return settle(p, gatewayOrderId, amountPaise);
}

/**
 * Without a payment ID (customer closed the tab, network dropped, no webhook):
 * look at every attempt on the Razorpay order and settle the successful one.
 */
export async function settleOrder(gatewayOrderId: string, amountPaise: number): Promise<Settlement> {
  const rzp = await razorpay();
  const res = (await rzp.orders.fetchPayments(gatewayOrderId)) as unknown as { items: RzpPayment[] };
  const items = [...(res.items ?? [])].sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
  const good = items.find((p) => p.status === "captured") ?? items.find((p) => p.status === "authorized");
  if (good) return settle(good, gatewayOrderId, amountPaise);
  const failed = items.find((p) => p.status === "failed");
  return failed ? { state: "failed", paymentId: failed.id, reason: failed.error_description ?? "Payment failed" } : { state: "pending" };
}

export async function refundPayment(paymentId: string, amountPaise: number, notes: Record<string, string>) {
  const rzp = await razorpay();
  const r = await rzp.payments.refund(paymentId, { amount: amountPaise, notes });
  return { id: r.id };
}
