import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

class LockedError extends CredentialsSignin {
  override code = "locked";
}

const MAX_FAILS = 5;
let dummyHash: string | null = null;
const LOCK_MINUTES = 15;

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  pages: { signIn: "/admin/login" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = z.object({ email: z.string().email(), password: z.string().min(1).max(200) }).safeParse(raw);
        if (!parsed.success) return null;
        const { db } = await import("@/server/db");
        const email = parsed.data.email.toLowerCase();
        const user = await db.adminUser.findUnique({ where: { email } });
        // Same work whether or not the account exists, so timing doesn't reveal it.
        dummyHash ??= await bcrypt.hash("not-a-real-password", 12);
        const hash = user?.passwordHash ?? dummyHash;
        const ok = await bcrypt.compare(parsed.data.password, hash);
        if (!user || !user.active) return null;
        if (user.lockedUntil && user.lockedUntil > new Date()) throw new LockedError();
        if (!ok) {
          const fails = user.failedLogins + 1;
          await db.adminUser.update({
            where: { id: user.id },
            data: {
              failedLogins: fails >= MAX_FAILS ? 0 : fails,
              lockedUntil: fails >= MAX_FAILS ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
            },
          });
          return null;
        }
        await db.adminUser.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() } });
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.uid as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
});
