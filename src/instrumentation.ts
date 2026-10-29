// Runs once when the server starts.
//
// On a normal long-running server (your computer, a VPS) this starts the payment
// check: every two minutes, open Razorpay orders are checked with Razorpay and
// unpaid ones past their deadline are expired.
//
// On serverless hosts (Netlify) there is no long-running server, so this is
// skipped; netlify/functions/payments-sweep.mjs calls /api/cron/payments every
// 5 minutes instead.

const serverless = () => Boolean(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL);

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.NODE_ENV === "production") checkProductionConfig();
  if (serverless() || process.env.PAYMENT_SWEEP === "off" || !process.env.DATABASE_URL) return;

  const g = globalThis as unknown as { __gsSweep?: ReturnType<typeof setInterval> };
  if (g.__gsSweep) return; // dev reloads
  const every = Math.max(30, Number(process.env.PAYMENT_SWEEP_SECONDS) || 120) * 1000;

  const run = async () => {
    try {
      const { reconcilePending } = await import("./features/payments/reconcile");
      const r = await reconcilePending();
      if (r.paid || r.expired) console.log(`[payments] checked ${r.checked}, confirmed ${r.paid}, expired ${r.expired}`);
    } catch (err) {
      console.error("[payments] sweep failed:", err instanceof Error ? err.message : err);
    }
  };
  g.__gsSweep = setInterval(run, every);
  g.__gsSweep.unref?.();
  setTimeout(run, 15_000).unref?.();
}

/** Loud log lines at startup for settings the live site can't do without. */
function checkProductionConfig() {
  const e = process.env;
  const problems: string[] = [];
  if (!e.DATABASE_URL) problems.push("DATABASE_URL is not set: shop, checkout and admin are off.");
  if (!e.AUTH_SECRET || e.AUTH_SECRET.length < 32) problems.push("AUTH_SECRET is missing or short (use: openssl rand -base64 32).");
  if (!e.NEXT_PUBLIC_SITE_URL?.startsWith("https://")) problems.push("NEXT_PUBLIC_SITE_URL should be your https:// address (set it before `npm run build`).");
  if (!e.CRON_SECRET || e.CRON_SECRET.length < 16) problems.push("CRON_SECRET is missing or short: the daily job can't run.");
  if (!e.ANALYTICS_SALT_SECRET) problems.push("ANALYTICS_SALT_SECRET is not set.");
  if (e.SEED_DEMO_STOCK === "true") problems.push('SEED_DEMO_STOCK="true" adds fake stock if the seed runs. Set it to "false".');
  if (serverless() && (e.STORAGE_DRIVER || "local") !== "s3") problems.push('STORAGE_DRIVER must be "s3" (Cloudflare R2) here: this host has no lasting disk, so uploads would vanish.');
  if (e.RAZORPAY_KEY_ID?.startsWith("rzp_test_")) problems.push("RAZORPAY_KEY_ID is a test key; the live site ignores it. Use live keys (rzp_live_…).");
  for (const p of problems) console.error(`[config] ${p}`);
  if (!problems.length) console.log("[config] production settings look complete.");
}
