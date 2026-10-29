// npm run admin:reset
// Checks the database in .env, sets it up if anything is missing, and resets the
// admin login to ADMIN_EMAIL / ADMIN_PASSWORD from .env. Safe to run any time.
import { ensureAdmin, ensureClient, ensureSchemaAndSeed, readEnv, say, warn } from "./lib-local.mjs";

const env = readEnv();
if (!env.DATABASE_URL) {
  warn("No DATABASE_URL in .env. Run `npm run local` first; it creates everything.");
  process.exit(1);
}
try {
  ensureClient();
  await ensureSchemaAndSeed(env);
  const a = await ensureAdmin(env);
  say(`Admin login works. ${a.admins} admin account${a.admins === 1 ? "" : "s"} in the database.`);
  console.log(`\n  Email      ${a.email}\n  Password   ${a.password}\n  Sign in at http://localhost:3000/admin\n`);
} catch (err) {
  if (String(err?.message ?? err).match(/ECONNREFUSED|connect/i)) {
    warn("Couldn't reach the local database. Start it with `npm run local` (it starts the database too).");
  } else {
    warn(String(err?.message ?? err));
  }
  process.exit(1);
}
