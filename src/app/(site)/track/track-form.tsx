"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { OrderSummary } from "@/components/site/order-summary";
import { trackOrder, type TrackState } from "./actions";

export function TrackForm() {
  const [state, action, pending] = useActionState<TrackState, FormData>(trackOrder, { status: "idle" });
  return (
    <>
      <form action={action} className="mt-8 grid max-w-2xl gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="flex flex-col gap-1.5">
          <span className="text-small font-medium">Order number</span>
          <input name="number" placeholder="GS-2600000" required className="h-12 rounded-xl border border-line bg-white/70 px-4 uppercase" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-small font-medium">Mobile number</span>
          <input name="phone" type="tel" autoComplete="tel-national" required className="h-12 rounded-xl border border-line bg-white/70 px-4" />
        </label>
        <Button type="submit" size="md" disabled={pending}>
          {pending ? "Looking…" : "Find it"}
        </Button>
      </form>
      {state.status === "error" ? (
        <p role="alert" className="mt-8 font-medium text-clay">
          {state.message}
        </p>
      ) : null}
      {state.status === "ok" ? (
        <div className="mt-12">
          <h2 className="mb-6 text-h3">{state.order.statusLabel}</h2>
          <OrderSummary order={state.order} />
        </div>
      ) : null}
    </>
  );
}
