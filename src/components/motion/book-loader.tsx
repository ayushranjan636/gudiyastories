/**
 * An open book whose pages turn while the next page loads.
 * Pure CSS (globals.css .book-loader), so it shows before any JavaScript runs.
 */
export function BookLoader({ label = "Turning the page…" }: { label?: string }) {
  return (
    <div role="status" className="grid min-h-[60dvh] place-items-center">
      <div className="flex flex-col items-center gap-6">
        <div className="book-loader" aria-hidden="true">
          <span className="book-loader__cover book-loader__cover--l" />
          <span className="book-loader__cover book-loader__cover--r" />
          <span className="book-loader__page" style={{ animationDelay: "0s" }} />
          <span className="book-loader__page" style={{ animationDelay: "0.35s" }} />
          <span className="book-loader__page" style={{ animationDelay: "0.7s" }} />
          <span className="book-loader__lines book-loader__lines--l" />
          <span className="book-loader__lines book-loader__lines--r" />
        </div>
        <p className="text-small text-ink-soft">{label}</p>
      </div>
    </div>
  );
}
