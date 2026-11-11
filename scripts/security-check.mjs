// Attack tests against the running site (npm run local). Each test tries something
// a person could do from the browser's Inspect panel or a script, and checks the
// server refuses. Run: node scripts/security-check.mjs
import pg from "pg";
import { createHmac } from "node:crypto";
import { readEnv } from "./lib-local.mjs";

const env = { ...readEnv(), ...process.env };
const B = process.env.BASE_URL || "http://localhost:3000";
const results = [];
const check = (ok, name, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m"}  ${name}${detail ? `  (${detail})` : ""}`);
};
const db = new pg.Client({ connectionString: env.DATABASE_URL });
await db.connect();
const count = async (where = "") => (await db.query(`SELECT count(*)::int n FROM "Order" ${where}`)).rows[0].n;

// --- Find the checkout server action ID, exactly like an attacker would in DevTools.
const page = await (await fetch(`${B}/checkout`)).text();
const chunks = [...page.matchAll(/src="(\/_next\/static\/[^"]+\.js)"/g)].map((m) => m[1]);
let actionIds = new Set();
for (const c of chunks) {
  const js = await (await fetch(B + c)).text();
  for (const m of js.matchAll(/createServerReference"?\]?\)\("([0-9a-f]{40,})"[\s\S]{0,800}?"(\w+)"\);/g)) actionIds.add(`${m[2]}:${m[1]}`);
}
const ids = Object.fromEntries([...actionIds].map((s) => s.split(":")));
if (!ids.placeOrder) {
  console.log("Could not find the placeOrder action in the page scripts. Found:", Object.keys(ids).join(", ") || "nothing");
  process.exit(1);
}

async function action(name, args, headers = {}) {
  const res = await fetch(`${B}/checkout`, {
    method: "POST",
    headers: { "Next-Action": ids[name], "Content-Type": "text/plain;charset=UTF-8", Accept: "text/x-component", Origin: B, ...headers },
    body: JSON.stringify(args),
  });
  const text = await res.text();
  // React's wire format: the action's return value is the last "1:{...}" line.
  const line = text.split("\n").filter((l) => /^1:[[{]/.test(l)).at(-1) ?? "";
  try {
    return { status: res.status, body: JSON.parse(line.slice(2)) };
  } catch {
    return { status: res.status, body: null, raw: text.slice(0, 200) };
  }
}

const good = {
  lines: [{ slug: "cheers-to-monday", quantity: 1 }],
  name: "Security Test",
  phone: "9876500000",
  email: "sec@example.com",
  line1: "1 Test Road",
  city: "Tirupati",
  state: "Andhra Pradesh",
  pinCode: "517501",
  method: "RAZORPAY",
  marketing: false,
  expectedTotalPaise: 19000,
};
const before = await count();

// 1. Change the price in the request (Inspect → edit the total).
let r = await action("placeOrder", [{ ...good, expectedTotalPaise: 100 }]);
check(r.body?.ok === false && r.body?.priceChanged, "Edited total (₹1 instead of ₹190) is refused", r.body?.error?.slice(0, 60));

// 2. Ask for cash on delivery / WhatsApp, which the page no longer offers.
for (const m of ["COD", "WHATSAPP"]) {
  r = await action("placeOrder", [{ ...good, method: m }]);
  check(r.body?.ok === false, `Payment method "${m}" sent by hand is refused`);
}

// 3. Bogus products, quantities, negative numbers.
r = await action("placeOrder", [{ ...good, lines: [{ slug: "cheers-to-monday", quantity: -5 }] }]);
check(r.body?.ok === false, "Negative quantity is refused");
r = await action("placeOrder", [{ ...good, lines: [{ slug: "cheers-to-monday", quantity: 999 }] }]);
check(r.body?.ok === false, "Quantity 999 is refused");
r = await action("placeOrder", [{ ...good, lines: [{ slug: "made-up-book", quantity: 1 }], expectedTotalPaise: 6000 }]);
check(r.body?.ok === false, "A product that doesn't exist is refused");
r = await action("placeOrder", [{ ...good, lines: [{ slug: "cheers-to-monday", quantity: 1, pricePaise: 1, unitPricePaise: 1 }], expectedTotalPaise: 100 }]);
check(r.body?.ok === false && r.body?.priceChanged, "A price sent from the browser is ignored (the server prices every line itself)", r.body?.error?.slice(0, 40));

// 4. Missing email, bot field filled in.
r = await action("placeOrder", [{ ...good, email: "" }]);
check(r.body?.ok === false && r.body?.fieldErrors?.email, "Order without an email is refused");
r = await action("placeOrder", [{ ...good, website: "http://spam.example" }]);
check(r.body?.ok === false, "Bot trap field filled in: refused");

// 5. Coming from another website (cross-site request).
const x = await fetch(`${B}/checkout`, {
  method: "POST",
  headers: { "Next-Action": ids.placeOrder, "Content-Type": "text/plain;charset=UTF-8", Origin: "https://evil.example", Accept: "text/x-component" },
  body: JSON.stringify([good]),
});
check(x.status >= 400, "Request from another website is blocked", `HTTP ${x.status}`);

check((await count()) === before, "None of the attempts above created an order", `${before} → ${await count()}`);

// 6. A real checkout creates only an unpaid attempt, never a paid order.
r = await action("placeOrder", [good]);
check(r.body?.ok === true && r.body?.kind === "razorpay", "A normal checkout opens Razorpay", r.body?.orderNumber);
const num = r.body?.orderNumber;
const row = (await db.query(`SELECT o.id, o.status, p."razorpayOrderId" rid FROM "Order" o JOIN "Payment" p ON p."orderId"=o.id WHERE o.number=$1`, [num])).rows[0];
check(row?.status === "PENDING_PAYMENT", "…and it stays unpaid until Razorpay confirms money", row?.status);

// 7. Fake "payment succeeded" callbacks.
if (ids.verifyPayment && row) {
  r = await action("verifyPayment", [{ razorpay_order_id: row.rid, razorpay_payment_id: "pay_FAKE000000001", razorpay_signature: "0".repeat(64) }]);
  check(r.body?.ok === false, "Fake payment with a made-up signature is refused");
  const forged = createHmac("sha256", "wrong-secret").update(`${row.rid}|pay_FAKE000000001`).digest("hex");
  r = await action("verifyPayment", [{ razorpay_order_id: row.rid, razorpay_payment_id: "pay_FAKE000000001", razorpay_signature: forged }]);
  check(r.body?.ok === false, "Fake payment signed with a guessed secret is refused");
  const status = (await db.query(`SELECT status FROM "Order" WHERE id=$1`, [row.id])).rows[0].status;
  check(status === "PENDING_PAYMENT", "Order is still unpaid after the fake payments", status);
}

// 8. Webhook without Razorpay's signature.
const wh = await fetch(`${B}/api/razorpay/webhook`, { method: "POST", body: JSON.stringify({ event: "order.paid", payload: { payment: { entity: { order_id: row?.rid } } } }) });
check(wh.status === 401 || wh.status === 503, "Fake Razorpay webhook is refused", `HTTP ${wh.status}`);

// 9. Not in the admin order list, not a customer, no receipt.
const unpaidListed = (await db.query(`SELECT count(*)::int n FROM "Order" WHERE number=$1 AND status NOT IN ('PENDING_PAYMENT','EXPIRED')`, [num])).rows[0].n;
check(unpaidListed === 0, "Unpaid attempt is not in the admin's order list");
const tok = createHmac("sha256", `order-link:${env.AUTH_SECRET}`).update(num ?? "").digest("base64url").slice(0, 22);
const rc = await fetch(`${B}/receipt/${num}?t=${tok}`);
check(rc.status === 404, "No receipt for an unpaid order", `HTTP ${rc.status}`);
const op = await (await fetch(`${B}/order/${num}`)).text();
check(!op.includes("Security Test") && !op.includes("1 Test Road") && !op.includes("sec@example.com"), "Order page without the private link shows none of the customer's details");

// 10. Scheduled jobs and admin without credentials.
for (const p of ["/api/cron/payments", "/api/cron/daily"]) {
  const c = await fetch(B + p);
  check(c.status === 401, `${p} without the secret is refused`, `HTTP ${c.status}`);
  const c2 = await fetch(B + p, { headers: { authorization: "Bearer undefined" } });
  check(c2.status === 401, `${p} with "Bearer undefined" is refused`, `HTTP ${c2.status}`);
}
for (const p of ["/admin", "/admin/orders", "/admin/settings"]) {
  const a = await fetch(B + p, { redirect: "manual" });
  check(a.status === 307 || a.status === 302 || a.status === 303, `${p} without signing in sends you to the login`, `HTTP ${a.status}`);
}
for (const p of ["/admin/export/orders", "/admin/export/customers"]) {
  const a = await fetch(B + p, { redirect: "manual" });
  check(a.status === 401, `${p} without signing in is refused`, `HTTP ${a.status}`);
}
const up = await fetch(`${B}/api/admin/upload/start`, { method: "POST", body: "{}" });
check(up.status === 401, "Upload without signing in is refused", `HTTP ${up.status}`);

// 11. Hammering: too many checkouts from one visitor get stopped.
let blocked = false;
for (let i = 0; i < 12 && !blocked; i++) {
  const t = await action("placeOrder", [{ ...good, expectedTotalPaise: 1 }]);
  if (t.body?.error?.includes("Too many")) blocked = true;
}
check(blocked, "Rapid repeated checkouts are rate-limited");

// 12. Security headers.
const h = (await fetch(B)).headers;
check(Boolean(h.get("content-security-policy")), "Content-Security-Policy header is set");
check(h.get("x-frame-options") === "SAMEORIGIN", "Site can't be shown inside another website (clickjacking)");

// Clean up what the test created.
await db.query(`DELETE FROM "RateLimit" WHERE key LIKE 'checkout:%' OR key LIKE 'verify:%' OR key LIKE 'quote:%'`);
await db.query(`DELETE FROM "Order" WHERE "contactPhone"='+919876500000'`);
await db.query(`DELETE FROM "Customer" c WHERE phone='+919876500000' AND NOT EXISTS (SELECT 1 FROM "Order" o WHERE o."customerId"=c.id)`);
await db.end();

const failed = results.filter((x) => !x).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
