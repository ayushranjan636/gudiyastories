"use client";

import { useActionState } from "react";
import { TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { login } from "./actions";

export function LoginForm() {
  const [error, action, pending] = useActionState<string | null, FormData>(login, null);
  return (
    <form action={action} className="mt-8 space-y-4">
      {error ? (
        <p role="alert" className="rounded-xl bg-clay/10 px-4 py-3 text-small font-medium text-clay">
          {error}
        </p>
      ) : null}
      <TextInput label="Email" name="email" type="email" autoComplete="username" required />
      <TextInput label="Password" name="password" type="password" autoComplete="current-password" required />
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
