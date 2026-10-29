// Runs before `npm run dev`. Keeps the database client and tables up to date
// after an update, or explains how to start everything when there's no database.
import fs from "node:fs";
const env = fs.existsSync(".env") ? fs.readFileSync(".env", "utf8") : "";
if (!process.env.DATABASE_URL && !/^DATABASE_URL="?postgres/m.test(env)) {
  console.log(`
  \x1b[33mNo database configured.\x1b[0m The public site will run on its built-in catalogue,
  but the shop, checkout and admin need the database.

  For everything (site + admin + test payments), stop this and run:

      \x1b[1mnpm run local\x1b[0m
`);
} else {
  try {
    const { ensureClient, applyMigrations, importPosts, readEnv } = await import("./lib-local.mjs");
    ensureClient();
    const pg = (await import("pg")).default;
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL || readEnv().DATABASE_URL, connectionTimeoutMillis: 3000 });
    await client.connect();
    try {
      await applyMigrations(client);
      await importPosts(client);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.log(`\x1b[33m!\x1b[0m Couldn't update the database (${String(err?.message ?? err).split("\n")[0]}). If it isn't running, use: npm run local`);
  }
}
