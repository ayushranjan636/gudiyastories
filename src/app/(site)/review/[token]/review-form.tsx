"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { submitReview } from "./actions";

export function ReviewForm({ token, items, firstName }: { token: string; items: { id: string; title: string }[]; firstName: string }) {
  const [done, setDone] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [ratings, setRatings] = useState<Record<string, number>>({});

  return (
    <div className="space-y-8">
      {items.map((it) =>
        done.includes(it.id) ? (
          <p key={it.id} className="rounded-2xl bg-paper-deep p-6">Thank you for reviewing <strong>{it.title}</strong>.</p>
        ) : (
          <form
            key={it.id}
            className="space-y-4 rounded-2xl border border-line p-6"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              setError(null);
              start(async () => {
                const r = await submitReview(token, { orderItemId: it.id, rating: ratings[it.id] ?? 0, title: String(f.get("title") ?? ""), body: String(f.get("body") ?? ""), displayName: String(f.get("name") ?? "") });
                if (r.ok) setDone((d) => [...d, it.id]);
                else setError(r.message);
              });
            }}
          >
            <h2 className="text-h4">{it.title}</h2>
            <fieldset>
              <legend className="text-small font-medium">Your rating</legend>
              <div className="mt-2 flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className={cn("grid size-11 cursor-pointer place-items-center rounded-full border text-small font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-leaf", (ratings[it.id] ?? 0) >= n ? "border-leaf bg-leaf text-white" : "border-line")}>
                    <input type="radio" name={`r-${it.id}`} className="sr-only" checked={ratings[it.id] === n} onChange={() => setRatings((r) => ({ ...r, [it.id]: n }))} />
                    {n}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="flex flex-col gap-1.5 text-small font-medium">Headline <span className="font-normal text-ink-soft">(optional)</span><input name="title" maxLength={100} className="h-12 rounded-xl border border-line bg-white/70 px-4 text-body font-normal" /></label>
            <label className="flex flex-col gap-1.5 text-small font-medium">What did your child think?<textarea name="body" required minLength={10} maxLength={2000} rows={4} className="rounded-xl border border-line bg-white/70 px-4 py-3 text-body font-normal" /></label>
            <label className="flex flex-col gap-1.5 text-small font-medium">Name to show<input name="name" defaultValue={firstName} required maxLength={40} className="h-12 rounded-xl border border-line bg-white/70 px-4 text-body font-normal" /><span className="font-normal text-ink-soft">For example, &ldquo;Priya, mother of a 7-year-old&rdquo;.</span></label>
            <Button type="submit" disabled={pending}>{pending ? "Sending…" : "Send review"}</Button>
          </form>
        ),
      )}
      {error ? <p role="alert" className="font-medium text-clay">{error}</p> : null}
    </div>
  );
}
