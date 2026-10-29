// One command to run the whole site locally:  npm run local
//
// 1. Starts Prisma's built-in local Postgres (nothing to install).
// 2. Writes .env the first time (database, secrets, admin login).
// 3. Creates the tables and seeds the books if needed.
// 4. Makes sure the admin login in .env works (creates or resets it, every run).
// 5. Starts the site on http://localhost:3000 (admin at /admin).

import { execSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { ensureAdmin, ensureClient, ensureSchemaAndSeed, envPath, portInUse, readEnv, root, say, warn } from "./lib-local.mjs";

// Local-only login. Change it in Admin → Settings → Your password.
const LOCAL_ADMIN_EMAIL = "admin@gudiyastories.local";
const LOCAL_ADMIN_PASSWORD = "GudiyaAdmin@2026";

function writeEnv(values) {
  let text = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  for (const [k, v] of Object.entries(values)) {
    const line = `${k}="${v}"`;
    const re = new RegExp(`^${k}=.*$`, "m");
    text = re.test(text) ? text.replace(re, line) : `${text.trimEnd()}\n${line}\n`;
  }
  fs.writeFileSync(envPath, text.trimStart());
}

function removeEnv(keys) {
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  const next = text.split("\n").filter((l) => !keys.some((k) => l.startsWith(`${k}=`))).join("\n");
  if (next !== text) fs.writeFileSync(envPath, next);
}

// 0. Another server on port 3000 would be the one your browser talks to.
if (await portInUse(3000)) {
  warn("Something is already running on http://localhost:3000 (probably an earlier `npm run dev`).");
  warn("Stop it with Ctrl+C in that Terminal window, then run `npm run local` again.");
  process.exit(1);
}

// 1. Database
say("Starting the local database…");
const out = execSync("npx prisma dev -d --name gudiya", { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
const url = out.match(/postgres:\/\/\S+/)?.[0];
if (!url) {
  console.error(out);
  throw new Error("Could not read the database address from `prisma dev`.");
}

// 2. .env (first run: copy .env.example, blank its placeholders, fill local values)
const firstRun = !fs.existsSync(envPath);
if (firstRun) {
  const example = readEnv(path.join(root, ".env.example"));
  writeEnv(Object.fromEntries(Object.entries(example).map(([k, v]) => [k, /<|xxxx|example\.com|change-me/i.test(v) ? "" : v])));
}
const env0 = readEnv();
if (firstRun || env0.LOCAL_DB === "prisma-dev") {
  writeEnv({
    LOCAL_DB: "prisma-dev",
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    AUTH_URL: "http://localhost:3000",
    AUTH_TRUST_HOST: "true",
    DATABASE_URL: url,
    DIRECT_URL: url,
    AUTH_SECRET: env0.AUTH_SECRET || randomBytes(32).toString("base64"),
    ANALYTICS_SALT_SECRET: env0.ANALYTICS_SALT_SECRET || randomBytes(16).toString("hex"),
    CRON_SECRET: env0.CRON_SECRET || randomBytes(16).toString("hex"),
    ADMIN_EMAIL: env0.ADMIN_EMAIL || LOCAL_ADMIN_EMAIL,
    ADMIN_PASSWORD: env0.ADMIN_PASSWORD || LOCAL_ADMIN_PASSWORD,
    ADMIN_NAME: env0.ADMIN_NAME || "S.V. Bharathi",
    SEED_DEMO_STOCK: "true",
  });
  say(firstRun ? "Created .env for local use." : "Checked .env.");
}
// Settings that are no longer used: the old built-in test gateway, the browser copy
// of the Razorpay Key ID (the server now sends it with each order) and Supabase.
removeEnv(["PAYMENTS_TEST_MODE", "NEXT_PUBLIC_RAZORPAY_KEY_ID", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_STORAGE_BUCKET_PUBLIC", "SUPABASE_STORAGE_BUCKET_PRIVATE"]);
const env = readEnv();

// 3–4. Client, tables (and any new ones after an update), seed, and a working admin login
ensureClient();
await ensureSchemaAndSeed(env);
const admin = await ensureAdmin(env);
say(`Admin login ready (${admin.admins} admin account${admin.admins === 1 ? "" : "s"} in the database).`);

const rzpKind = env.RAZORPAY_KEY_ID?.startsWith("rzp_live_") ? "LIVE keys, real money" : "test keys, no real money";
const payments =
  env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET
    ? `Razorpay (${rzpKind})`
    : env.RAZORPAY_KEY_ID
      ? "off. Razorpay Key ID found, but RAZORPAY_KEY_SECRET in .env is empty"
      : "Razorpay keys from Admin → Settings → Online payments (off until added)";
console.log(`
  \x1b[1mGudiya Stories\x1b[0m
  Site       http://localhost:3000
  Admin      http://localhost:3000/admin
  Email      ${admin.email}
  Password   ${admin.password}
  Payments   ${payments}
  Uploads    ${env.STORAGE_DRIVER === "s3" ? `Amazon S3 (${env.S3_BUCKET})` : "this computer (storage/uploads)"}

  Stop with Ctrl+C. Start again with: npm run local
`);

// 5. Site
const dev = spawn("npx", ["next", "dev", "-p", "3000"], { cwd: root, stdio: "inherit", env: { ...process.env, ...env } });
dev.on("exit", (code) => process.exit(code ?? 0));
