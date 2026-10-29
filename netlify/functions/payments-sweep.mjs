// Every 5 minutes (netlify.toml): checks open Razorpay payments with Razorpay and
// expires unpaid orders. Catches customers who paid and closed the tab before
// the site heard back. Calls the site's own /api/cron/payments with CRON_SECRET.
async function paymentsSweep() {
  const base = process.env.URL;
  const secret = process.env.CRON_SECRET;
  if (!base || !secret) return console.error("[payments-sweep] URL or CRON_SECRET missing");
  const res = await fetch(`${base}/api/cron/payments`, { headers: { authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(25_000) });
  console.log(`[payments-sweep] ${res.status} ${await res.text()}`);
}

export default paymentsSweep;
