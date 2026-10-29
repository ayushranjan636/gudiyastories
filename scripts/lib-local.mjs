// Shared helpers for scripts/local.mjs and scripts/admin-reset.mjs.
import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

export const root = path.resolve(import.meta.dirname, "..");
export const envPath = path.join(root, ".env");
export const say = (s) => console.log(`\x1b[32m›\x1b[0m ${s}`);
export const warn = (s) => console.log(`\x1b[33m!\x1b[0m ${s}`);

export function readEnv(file = envPath) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(file, "utf8")
      .split("\n")
      .filter((l) => /^[A-Z0-9_]+=/.test(l))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
      }),
  );
}

/**
 * Brings the database up to date: applies every migration in prisma/migrations
 * that hasn't run yet, and records it in Prisma's own _prisma_migrations table
 * (so `prisma migrate deploy` on a server sees the same history). Then seeds the
 * catalogue if it's empty. Returns true if it seeded.
 */
export async function ensureSchemaAndSeed(env) {
  const client = new pg.Client({ connectionString: env.DATABASE_URL });
  await client.connect();
  try {
    await applyMigrations(client);
    const { rows: p } = await client.query(`SELECT count(*)::int AS n FROM "Product"`);
    let seeded = false;
    if (p[0].n === 0) {
      say("Adding the books, sets and settings…");
      execSync("npx tsx prisma/seed.ts", { cwd: root, stdio: "inherit", env: { ...process.env, ...env } });
      seeded = true;
    }
    await importPosts(client);
    return seeded;
  } finally {
    await client.end();
  }
}

export async function applyMigrations(client) {
  await client.query(`CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" VARCHAR(36) PRIMARY KEY NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0
  )`);
  const { rows } = await client.query(`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`);
  const done = new Set(rows.map((r) => r.migration_name));
  const dir = path.join(root, "prisma", "migrations");
  const names = fs.readdirSync(dir).filter((d) => fs.statSync(path.join(dir, d)).isDirectory()).sort();
  const { createHash, randomUUID } = await import("node:crypto");
  for (const name of names) {
    if (done.has(name)) continue;
    const sql = fs.readFileSync(path.join(dir, name, "migration.sql"), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    // Databases made before this history was kept: the first migration is already there.
    const { rows: t } = await client.query(`SELECT to_regclass('public."Product"') AS t`);
    const baseline = name === names[0] && t[0].t;
    if (!baseline) say(name === names[0] ? "Creating tables…" : `Updating the database (${name.replace(/^\d+_/, "").replace(/_/g, " ")})…`);
    await client.query("BEGIN");
    try {
      if (!baseline) await client.query(sql);
      await client.query(
        `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count, started_at) VALUES ($1, $2, now(), $3, 1, now())`,
        [randomUUID(), checksum, name],
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
  }
}

/**
 * Blog posts shipped with the code (prisma/content/posts/*.json). Each one is
 * added once, if no post has its address yet. Never overwrites: once a post is
 * in the database, edits made in Admin → Blog win.
 */
export async function importPosts(client) {
  const dir = path.join(root, "prisma", "content", "posts");
  if (!fs.existsSync(dir)) return 0;
  const { randomBytes } = await import("node:crypto");
  const cid = () => `c${randomBytes(12).toString("hex")}`;
  let added = 0;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
    const post = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    const { rows: exists } = await client.query(`SELECT 1 FROM "Post" WHERE slug = $1`, [post.slug]);
    if (exists.length) continue;
    await client.query("BEGIN");
    try {
      let categoryId = null;
      if (post.category) {
        const { rows } = await client.query(
          `INSERT INTO "Category" (id, slug, name) VALUES ($1, $2, $3) ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug RETURNING id`,
          [cid(), post.category.slug, post.category.name],
        );
        categoryId = rows[0].id;
      }
      const { rows: author } = await client.query(`SELECT id FROM "AdminUser" WHERE active ORDER BY (role = 'OWNER') DESC, "createdAt" ASC LIMIT 1`);
      const id = cid();
      const published = post.status === "PUBLISHED";
      await client.query(
        `INSERT INTO "Post" (id, slug, title, excerpt, content, "contentHtml", status, "publishedAt", "readingMinutes", "previewToken", "seoTitle", "seoDescription", "categoryId", "authorId", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, CASE WHEN $8::boolean THEN now() END, $9, $10, $11, $12, $13, $14, now(), now())`,
        [id, post.slug, post.title, post.excerpt, JSON.stringify({ type: "doc", content: [] }), post.contentHtml, post.status ?? "DRAFT", published,
         post.readingMinutes ?? 1, cid(), post.seoTitle ?? null, post.seoDescription ?? null, categoryId, author[0]?.id ?? null],
      );
      for (const name of post.tags ?? []) {
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        const { rows } = await client.query(
          `INSERT INTO "Tag" (id, slug, name) VALUES ($1, $2, $3) ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug RETURNING id`,
          [cid(), slug, name],
        );
        await client.query(`INSERT INTO "_PostTags" ("A", "B") VALUES ($1, $2) ON CONFLICT DO NOTHING`, [id, rows[0].id]);
      }
      await client.query("COMMIT");
      say(`Added blog post: ${post.title}`);
      added++;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
  }
  return added;
}

/** Regenerates the Prisma client when the schema is newer than it (after an update). */
export function ensureClient() {
  const out = path.join(root, "src", "generated", "prisma", "client.ts");
  const dir = path.join(root, "prisma", "schema");
  const newest = Math.max(...fs.readdirSync(dir).map((f) => fs.statSync(path.join(dir, f)).mtimeMs));
  if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= newest) return false;
  say("Updating the database client…");
  execSync("npx prisma generate", { cwd: root, stdio: ["ignore", "ignore", "inherit"] });
  return true;
}

/** Makes sure the login in .env works: creates or resets that admin account and unlocks it. */
export async function ensureAdmin(env) {
  const email = (env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = env.ADMIN_PASSWORD || "";
  if (!email || password.length < 12) throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters) must be set in .env");
  const bcrypt = (await import("bcryptjs")).default;
  const hash = await bcrypt.hash(password, 12);
  const client = new pg.Client({ connectionString: env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(
      `INSERT INTO "AdminUser" (id, email, name, "passwordHash", role, active, "failedLogins", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, 'OWNER', true, 0, now(), now())
       ON CONFLICT (email) DO UPDATE SET "passwordHash" = EXCLUDED."passwordHash", role = 'OWNER', active = true, "lockedUntil" = NULL, "failedLogins" = 0, "updatedAt" = now()`,
      [`c${randomBytes(12).toString("hex")}`, email, env.ADMIN_NAME || "Owner", hash],
    );
    // Prove it: read it back and check the password the same way the login does.
    const { rows } = await client.query(`SELECT "passwordHash", active FROM "AdminUser" WHERE email = $1`, [email]);
    const ok = rows[0] && rows[0].active && (await bcrypt.compare(password, rows[0].passwordHash));
    if (!ok) throw new Error("Could not verify the admin login after saving it.");
    const { rows: c } = await client.query(`SELECT count(*)::int AS n FROM "AdminUser"`);
    return { email, password, admins: c[0].n };
  } finally {
    await client.end();
  }
}

/** True if something is already listening on the port (for example an earlier `npm run dev`). */
export async function portInUse(port) {
  const net = await import("node:net");
  return new Promise((resolve) => {
    const s = net.connect({ host: "127.0.0.1", port }, () => {
      s.destroy();
      resolve(true);
    });
    s.on("error", () => resolve(false));
    s.setTimeout(800, () => {
      s.destroy();
      resolve(false);
    });
  });
}
