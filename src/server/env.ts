import "server-only";

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}
