"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** While a payment is being confirmed, re-checks every few seconds for up to three minutes. */
export function PendingRefresh() {
  const router = useRouter();
  useEffect(() => {
    let n = 0;
    const id = window.setInterval(() => {
      n += 1;
      if (n > 36) return window.clearInterval(id);
      router.refresh();
    }, 5000);
    return () => window.clearInterval(id);
  }, [router]);
  return (
    <p className="mb-6 inline-flex items-center gap-2 text-small text-ink-soft" role="status">
      <span className="size-2 animate-pulse rounded-full bg-lime" aria-hidden="true" /> Checking with the bank…
    </p>
  );
}
