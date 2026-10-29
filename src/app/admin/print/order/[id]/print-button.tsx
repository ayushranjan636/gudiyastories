"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="rounded-full bg-ink px-4 py-2 text-small text-paper">
      Print
    </button>
  );
}
