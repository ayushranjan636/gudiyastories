import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "./db";
import { hasDatabase } from "./env";
import type { Prisma } from "@/generated/prisma/client";

export type AdminSession = { id: string; email: string; name: string; role: "OWNER" | "STAFF" };

/** Every admin page and server action calls this first. Checks the session against the database, not just the cookie. */
export async function requireAdmin(role?: "OWNER"): Promise<AdminSession> {
  if (!hasDatabase()) redirect("/admin/login");
  const session = await auth();
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id) redirect("/admin/login");
  const user = await db.adminUser.findUnique({ where: { id }, select: { id: true, email: true, name: true, role: true, active: true } });
  if (!user || !user.active) redirect("/admin/login");
  if (role === "OWNER" && user.role !== "OWNER") redirect("/admin?denied=1");
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

/** For route handlers: the signed-in, active admin, or null (no redirect). */
export async function currentAdmin(): Promise<AdminSession | null> {
  if (!hasDatabase()) return null;
  const session = await auth();
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id) return null;
  const user = await db.adminUser.findUnique({ where: { id }, select: { id: true, email: true, name: true, role: true, active: true } });
  return user?.active ? { id: user.id, email: user.email, name: user.name, role: user.role } : null;
}

export async function audit(
  admin: AdminSession,
  action: "CREATE" | "UPDATE" | "DELETE",
  entity: string,
  entityId: string,
  before?: unknown,
  after?: unknown,
) {
  const toJson = (v: unknown) => (v === undefined ? undefined : (JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue));
  await db.auditLog.create({
    data: { adminUserId: admin.id, action, entity, entityId, before: toJson(before), after: toJson(after) },
  });
}
