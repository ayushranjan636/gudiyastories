import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma CLI (migrate, studio, seed) uses the direct, non-pooled Supabase
// connection. The app runtime uses DATABASE_URL (pooled) via the pg adapter
// in src/server/db.ts.
export default defineConfig({
  schema: "prisma/schema",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
