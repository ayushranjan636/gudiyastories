// The bag lives in localStorage and is read through useSyncExternalStore,
// so every tab and component sees the same lines and there is no
// hydration flash. Storage can be unavailable (private windows): the bag
// then works in memory for the visit.

export type BagLine = { slug: string; quantity: number };

const KEY = "gs-bag-v1";
const EVENT = "gs-bag-change";
let memory = "[]";

function read(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "[]";
  } catch {
    return memory;
  }
}

export function getSnapshot() {
  return read();
}

export function getServerSnapshot(): string | null {
  return null;
}

export function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT, cb);
  };
}

const cache = new Map<string, BagLine[]>();
export function parse(raw: string): BagLine[] {
  const hit = cache.get(raw);
  if (hit) return hit;
  let lines: BagLine[] = [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      lines = parsed.filter(
        (l): l is BagLine => typeof l?.slug === "string" && Number.isInteger(l?.quantity) && l.quantity > 0,
      );
    }
  } catch {
    lines = [];
  }
  cache.clear();
  cache.set(raw, lines);
  return lines;
}

export function write(update: (lines: BagLine[]) => BagLine[]) {
  const next = JSON.stringify(update(parse(read())));
  memory = next;
  try {
    window.localStorage.setItem(KEY, next);
  } catch {
    /* in-memory only */
  }
  window.dispatchEvent(new Event(EVENT));
}
