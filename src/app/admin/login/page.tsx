import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasDatabase } from "@/server/env";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default async function LoginPage() {
  if (hasDatabase()) {
    const session = await auth();
    if (session?.user) redirect("/admin");
  }
  return (
    <main className="grid min-h-dvh place-items-center px-5">
      <div className="w-full max-w-sm">
        <Image src="/brand/gudiya-stories-mark.png" alt="" width={667} height={490} className="mx-auto h-16 w-auto" preload />
        <h1 className="mt-6 text-center text-h3">Gudiya Stories admin</h1>
        {hasDatabase() ? (
          <LoginForm />
        ) : (
          <div className="mt-6 rounded-xl bg-paper-deep p-5 text-small">
            <p className="font-medium">The admin needs the local database, which isn&apos;t running.</p>
            <p className="mt-2 text-ink-soft">Stop the current server (Ctrl+C in Terminal), then start everything with:</p>
            <pre className="mt-3 rounded-lg bg-ink px-4 py-3 font-mono text-paper">npm run local</pre>
            <p className="mt-3 text-ink-soft">
              It sets up the database the first time and prints the admin login: <strong>admin@gudiyastories.local</strong> /{" "}
              <strong>GudiyaAdmin@2026</strong>.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
