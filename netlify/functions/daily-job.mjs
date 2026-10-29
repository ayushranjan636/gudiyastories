// Daily at 08:00 IST (netlify.toml): settles open payments, expires unpaid orders,
// emails the owner the low-stock digest and today's enquiry follow-ups.
async function dailyJob() {
  const base = process.env.URL;
  const secret = process.env.CRON_SECRET;
  if (!base || !secret) return console.error("[daily-job] URL or CRON_SECRET missing");
  const res = await fetch(`${base}/api/cron/daily`, { headers: { authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(25_000) });
  console.log(`[daily-job] ${res.status} ${await res.text()}`);
}

export default dailyJob;
