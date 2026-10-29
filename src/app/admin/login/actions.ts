"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { clientKey, rateLimit } from "@/server/rate-limit";

export async function login(_prev: string | null, form: FormData): Promise<string | null> {
  if (!(await rateLimit(await clientKey("admin-login"), 10, 900))) {
    return "Too many sign-in attempts. Please wait fifteen minutes.";
  }
  try {
    await signIn("credentials", {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      redirectTo: "/admin",
    });
    return null;
  } catch (err) {
    if (err instanceof AuthError) {
      return (err as { code?: string }).code === "locked"
        ? "This account is locked for fifteen minutes after too many wrong passwords."
        : await devHint(String(form.get("email") ?? ""));
    }
    throw err; // the redirect on success is thrown as an error and must pass through
  }
}

/** On your own computer, say *why* sign-in failed. Live, never reveal which accounts exist. */
async function devHint(email: string) {
  const generic = "That email and password don't match.";
  if (process.env.NODE_ENV === "production") return generic;
  try {
    const { db } = await import("@/server/db");
    const total = await db.adminUser.count();
    if (total === 0) return "There is no admin account yet. In Terminal run: npm run admin:reset";
    const exists = await db.adminUser.findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true } });
    if (!exists) return `No admin account uses that email. In Terminal run: npm run admin:reset (it prints the login).`;
    return `${generic} To reset it to the one in .env, run: npm run admin:reset`;
  } catch {
    return generic;
  }
}

export async function logout() {
  await signOut({ redirectTo: "/admin/login" });
}
