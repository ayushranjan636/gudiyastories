// npm run db:deploy  (runs before every Netlify build, see netlify.toml)
//
// Brings the live database up to date, safely and repeatably:
//   1. Applies any new migration in prisma/migrations (recorded in Prisma's own
//      _prisma_migrations table, so `prisma migrate status` agrees).
//   2. First deploy only (no books yet): adds the books, sets, values, settings
//      and the owner login from ADMIN_EMAIL / ADMIN_PASSWORD.
//   3. Adds any blog post shipped with the code that isn't in the database yet.
//
// It never resets a password or overwrites anything edited in Admin.
// Uses DIRECT_URL (Supabase "Session pooler", port 5432) because migrations
// need a normal session; the site itself uses DATABASE_URL (port 6543).

import { ensureSchemaAndSeed, readEnv, say, warn } from "./lib-local.mjs";

const env = { ...readEnv(), ...process.env };
const url = env.DIRECT_URL || env.DATABASE_URL;
if (!url) {
  // Lets a first Netlify build succeed before the database is connected.
  warn("No DATABASE_URL / DIRECT_URL set: skipping the database update. The site runs on its built-in catalogue until you add one.");
  process.exit(0);
}
if (env.SEED_DEMO_STOCK === "true" && (env.NETLIFY || env.NODE_ENV === "production")) {
  warn('SEED_DEMO_STOCK="true" would add fake stock to the live database. Set it to "false".');
  process.exit(1);
}

try {
  const seeded = await ensureSchemaAndSeed({ ...env, DATABASE_URL: url, DIRECT_URL: url });
  say(seeded ? `Database created and filled. Owner login: ${env.ADMIN_EMAIL}` : "Database is up to date.");
} catch (err) {
  const msg = String(err?.message ?? err);
  warn(`Database update failed: ${msg.split("\n")[0]}`);
  if (/certificate/i.test(msg)) warn("SSL problem: end the database addresses with ?uselibpqcompat=true&sslmode=require (docs/DEPLOY-NETLIFY.md).");
  if (/ENOTFOUND|ENETUNREACH|EHOSTUNREACH/i.test(msg)) warn("Use Supabase's pooler addresses (…pooler.supabase.com), not db.<project>.supabase.co, which needs IPv6.");
  if (/password authentication|Tenant or user not found/i.test(msg)) warn("Wrong database user or password. The pooler user looks like postgres.<project-ref>.");
  process.exit(1);
}
