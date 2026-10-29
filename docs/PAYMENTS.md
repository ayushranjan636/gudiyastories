# Payments

Checkout has the whole payment flow built in. All you add is your Razorpay keys. There is **no test or pretend gateway**:

- **No keys:** checkout offers cash on delivery and WhatsApp only.
- **Keys added:** checkout takes real payments through Razorpay straight away.

## Adding your keys (the normal way)

1. Razorpay dashboard → switch to **Live mode** → Account & Settings → **API Keys** → **Generate key**. You get a **Key ID** (`rzp_live_…`) and a **Key Secret**. The secret is shown only once.
2. In the site: **Admin → Settings → Online payments (Razorpay)**. Paste both and press **Save and turn on payments**.
   - The keys are **checked with Razorpay** before saving, so a typo can't switch payments off by accident.
   - The secret is stored **encrypted** (AES-256-GCM, key derived from `AUTH_SECRET`) and is never shown again. Leave the box empty when updating other fields to keep it.
   - Only the Owner can see or change this.
3. The badge turns green: **Live: customers are charged**.

To switch online payment off, press **Remove keys**.

**The live site refuses test keys** (`rzp_test_…`). With test keys anyone could "pay" with Razorpay's test UPI ID and get real books sent. Test keys only work on your own computer (`npm run local`), where nothing is charged.

You can also set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` as environment variables. These take priority over the keys saved in Admin.

If `AUTH_SECRET` is ever changed, the saved keys can't be read any more. Admin then asks you to enter them again.

## How a payment works

1. **The total comes from the server.**
   - The customer fills in checkout, and the total on screen is calculated by the server.
   - When they press **Pay**, the browser sends that total back. The server works it out again from the database (prices, coupon, delivery).
   - **If the two differ by even one paisa, nothing is charged** and the customer sees the new total.
2. **Razorpay order.** The server stores the order ("Waiting for payment") and creates a Razorpay order for **exactly the stored total**, set to capture automatically.
3. **Payment.** Razorpay's window opens with that amount. The customer pays by UPI, card, netbanking or wallet.
4. **Confirmation.** The browser hands back Razorpay's signed result. The server then:
   - checks the signature with your Key Secret;
   - **fetches the payment from Razorpay's API** and checks that it belongs to this order, is for exactly the order total in INR, and is captured;
   - captures the payment itself if it's only "authorized" (otherwise Razorpay would refund it after a few days);
   - only then marks the order paid and deducts stock, once.
5. **If the customer never comes back** (tab closed, phone lost signal right after paying), the order still confirms:
   - their order page asks Razorpay while it shows "Checking with the bank…";
   - every open Razorpay order is checked on a schedule: every **5 minutes** on Netlify (`netlify/functions/payments-sweep.mjs`), or every 2 minutes on a normal server (`src/instrumentation.ts`);
   - in Admin, the order page has a **Check payment with Razorpay** button for when a customer says "I paid".
6. **Proof for the customer.** They land on their order page with:
   - amount paid, payment ID, method (UPI ID, card's last four digits) and time;
   - a **Receipt** button (print or save as PDF);
   - a **Save on WhatsApp** button;
   - a receipt email once Resend is set up.
7. **Notification to you.** You get an email, and the order shows under Admin → Orders.

Unpaid orders expire after 30 minutes. If a payment for an expired order arrives anyway, it's still confirmed (the money is real) and the timeline asks you to check stock. A payment for any other amount is **never** confirmed; it's flagged on the order.

## Webhook (recommended once the site is live)

A webhook is something **you** create in Razorpay, and its secret is **text you make up**. It only works on the live site: Razorpay can't call `localhost`. It's an extra signal and runs the same Razorpay check as everything else:

1. In the Razorpay dashboard, go to Account & Settings → Webhooks → **Add new webhook**.
2. URL: `https://your-domain/api/razorpay/webhook`
3. Secret: any long random text (for example from `openssl rand -hex 32`). Paste the same text into **Webhook secret** in Admin → Settings → Online payments.
4. Events: `payment.authorized`, `payment.captured`, `payment.failed`, `order.paid`, `refund.processed`.

## Before the first real order

1. **KYC.** Finish Razorpay KYC. They check the Shipping, Returns, Privacy and Terms pages, so approve those first (`src/content/help.ts`).
2. **Keys.** Paste the live keys in Admin, as described above.
3. **Webhook.** Add it as described above.
4. **Test it.** Place one small real order, then refund it from Admin → Orders → Refund.

## Proof for the customer: email and WhatsApp

- **Email receipt:** set `RESEND_API_KEY`, `EMAIL_FROM` (an address on your verified domain) and `OWNER_NOTIFICATION_EMAIL`.
- **Automatic WhatsApp message** (optional):
  1. Set up the WhatsApp Cloud API in Meta Business.
  2. Get a message template approved with three variables (name, order number, total).
  3. Set `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_ORDER_TEMPLATE`.

  Without these, customers use the **Save on WhatsApp** button on their order page.

## Where the code lives

| File | What it does |
| --- | --- |
| `src/features/payments/gateway.ts` | The only file that talks to Razorpay: create order, verify signature, fetch/capture payment, refund, check keys |
| `src/features/payments/credentials.ts` | Where the keys come from (environment, or saved encrypted from Admin); live-only rule |
| `src/features/payments/reconcile.ts` | Turns "Razorpay says captured, right amount" into a paid order; the 2-minute sweep |
| `src/instrumentation.ts` | Starts the sweep on a normal server (skipped on Netlify) |
| `netlify/functions/payments-sweep.mjs` | The sweep on Netlify, every 5 minutes |
| `src/features/checkout/actions.ts` | Prices the bag on the server, locks the amount, creates the order, handles the browser's callback |
| `src/app/api/razorpay/webhook/route.ts` | Optional webhook; runs the same check |
| `src/app/api/cron/payments/route.ts` | The sweep, for an outside scheduler |
| `src/features/orders/service.ts` | `confirmOrder()`: marks the order paid exactly once (even if confirmations arrive together), deducts stock, sends the receipts |
