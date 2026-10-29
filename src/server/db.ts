import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("DATABASE_URL is not set. Run `npm run local` to start the site with a local database (see README).");
    this.name = "DatabaseNotConfiguredError";
  }
}

function client(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new DatabaseNotConfiguredError();
  // On serverless hosts (Netlify) every function instance has its own pool, so keep
  // each one small and let the Supabase pooler (port 6543) share real connections.
  const serverless = Boolean(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL);
  const max = Number(process.env.DATABASE_POOL_MAX) || (serverless ? 2 : 10);
  const c = new PrismaClient({ adapter: new PrismaPg({ connectionString, max, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 10_000 }) });
  globalForPrisma.prisma = c;
  return c;
}

/**
 * The database client, created on first use rather than on import, so pages
 * that only *might* need the database still load when none is configured.
 */
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const c = client();
    const value = Reflect.get(c, prop, c) as unknown;
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(c) : value;
  },
});
