// Checks /srv/gudiya/shared/.env before a release goes live. Stops the deploy
// on anything that would break the site; warns about the rest.
import { readEnv } from "../../scripts/lib-local.mjs";

const env = { ...readEnv(), ...process.env };
const errors = [];
const warnings = [];
const blank = (v) => !v || /__[A-Z_]+__|<[^>]+>/.test(v);

if (blank(env.DATABASE_URL)) errors.push("DATABASE_URL is not filled in. Run setup-server.sh again.");
if (!env.AUTH_SECRET || env.AUTH_SECRET.length < 32) errors.push("AUTH_SECRET is missing or too short.");
if (!env.NEXT_PUBLIC_SITE_URL?.startsWith("https://")) errors.push("NEXT_PUBLIC_SITE_URL must be your https:// address.");
if (!env.CRON_SECRET || env.CRON_SECRET.length < 16) errors.push("CRON_SECRET is missing or too short.");
if (!env.ANALYTICS_SALT_SECRET) errors.push("ANALYTICS_SALT_SECRET is missing.");
if (env.SEED_DEMO_STOCK === "true") errors.push('SEED_DEMO_STOCK must be "false" on the live site.');
if (!env.UPLOAD_DIR) errors.push('UPLOAD_DIR must be "/srv/gudiya/shared/uploads" so uploads survive deploys.');
if (env.ADMIN_PASSWORD && env.ADMIN_PASSWORD.length < 12) errors.push("ADMIN_PASSWORD must be at least 12 characters.");
if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) warnings.push("ADMIN_EMAIL / ADMIN_PASSWORD are empty. They're needed on the first deploy to create the owner login.");
if (!env.RESEND_API_KEY || !env.EMAIL_FROM) warnings.push("RESEND_API_KEY / EMAIL_FROM are empty: no order emails will be sent.");
if (!env.OWNER_NOTIFICATION_EMAIL) warnings.push("OWNER_NOTIFICATION_EMAIL is empty: new-order emails go to the shop's public address.");
if (env.RAZORPAY_KEY_ID?.startsWith("rzp_test_")) warnings.push("RAZORPAY_KEY_ID is a test key; the live site ignores it.");

for (const w of warnings) console.log(`\x1b[33m!\x1b[0m ${w}`);
for (const e of errors) console.log(`\x1b[31m✗\x1b[0m ${e}`);
if (errors.length) {
  console.log("\nFix these with:  sudo nano /srv/gudiya/shared/.env   then deploy again.");
  process.exit(1);
}
console.log("\x1b[32m›\x1b[0m Settings OK.");
