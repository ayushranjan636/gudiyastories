"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { subscribe, type SubscribeState } from "./actions";

export function SubscribeForm({ source }: { source: string }) {
  const [state, action, pending] = useActionState<SubscribeState, FormData>(subscribe, { status: "idle" });
  if (state.status === "ok") {
    return (
      <p role="status" className="self-center font-display text-h4">
        Thank you. You&apos;re on the list.
      </p>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-3 self-center sm:flex-row">
      <input type="hidden" name="source" value={source} />
      <label className="sr-only" htmlFor="sub-email">
        Email
      </label>
      <input
        id="sub-email"
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="you@example.com"
        className="h-12 min-w-0 flex-1 rounded-full border border-line bg-white/70 px-5"
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Keep me posted"}
      </Button>
      {state.status === "error" ? (
        <p role="alert" className="text-small text-clay sm:basis-full">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
