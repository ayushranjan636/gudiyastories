"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ProductSummary } from "@/features/catalogue/types";
import { SITE } from "@/config/site";
import { track } from "@/features/analytics/track";
import { getServerSnapshot, getSnapshot, parse, subscribe, write, type BagLine } from "./bag-store";
import { BagToast, type ToastData } from "./bag-toast";

export type { BagLine };
export type BagItem = BagLine & { product: ProductSummary; lineTotalPaise: number };

type Flight = { id: number; src: string; from: DOMRect; to: DOMRect };

type BagContextValue = {
  items: BagItem[];
  count: number;
  subtotalPaise: number;
  shippingPaise: number;
  toFreeShippingPaise: number;
  freeFromPaise: number | null;
  add: (slug: string, quantity?: number, sourceEl?: HTMLElement | null) => void;
  setQuantity: (slug: string, quantity: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  ready: boolean;
  bump: number;
};

const BagContext = createContext<BagContextValue | null>(null);
const MAX_QTY = 20;

export function BagProvider({
  products,
  shipping = { flatPaise: SITE.flatShippingPaise, freeFromPaise: SITE.freeShippingFromPaise },
  children,
}: {
  products: ProductSummary[];
  shipping?: { flatPaise: number; freeFromPaise: number | null };
  children: ReactNode;
}) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ready = raw !== null;
  const lines = useMemo(() => (raw ? parse(raw) : []), [raw]);
  const [open, setOpen] = useState(false);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [bump, setBump] = useState(0);
  const [toast, setToast] = useState<ToastData | null>(null);
  const flightId = useRef(0);
  const reduceMotion = useReducedMotion();

  const bySlug = useMemo(() => new Map(products.map((p) => [p.slug, p])), [products]);

  const items = useMemo<BagItem[]>(
    () =>
      lines.flatMap((l) => {
        const product = bySlug.get(l.slug);
        return product ? [{ ...l, product, lineTotalPaise: product.pricePaise * l.quantity }] : [];
      }),
    [lines, bySlug],
  );

  const subtotalPaise = items.reduce((n, i) => n + i.lineTotalPaise, 0);
  const count = items.reduce((n, i) => n + i.quantity, 0);
  const free = shipping.freeFromPaise != null && subtotalPaise >= shipping.freeFromPaise;
  const shippingPaise = count === 0 || free ? 0 : shipping.flatPaise;
  const toFreeShippingPaise = shipping.freeFromPaise == null ? -1 : Math.max(0, shipping.freeFromPaise - subtotalPaise);

  const add = useCallback(
    (slug: string, quantity = 1, sourceEl?: HTMLElement | null) => {
      const product = bySlug.get(slug);
      if (!product) return;
      write((prev) => {
        const existing = prev.find((l) => l.slug === slug);
        if (existing) {
          return prev.map((l) => (l.slug === slug ? { ...l, quantity: Math.min(MAX_QTY, l.quantity + quantity) } : l));
        }
        return [...prev, { slug, quantity: Math.min(MAX_QTY, quantity) }];
      });
      track("add_to_bag", { productSlug: slug, valuePaise: product.pricePaise * quantity });
      setToast({ id: Date.now(), slug, title: product.title, cover: product.cover, pricePaise: product.pricePaise });

      const target = document.getElementById("bag-target");
      if (!reduceMotion && sourceEl && target && target.offsetParent !== null) {
        const id = ++flightId.current;
        setFlights((f) => [
          ...f,
          { id, src: product.cover.src, from: sourceEl.getBoundingClientRect(), to: target.getBoundingClientRect() },
        ]);
      } else {
        setBump((b) => b + 1);
      }
    },
    [bySlug, reduceMotion],
  );

  const setQuantity = useCallback((slug: string, quantity: number) => {
    write((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.slug !== slug)
        : prev.map((l) => (l.slug === slug ? { ...l, quantity: Math.min(MAX_QTY, quantity) } : l)),
    );
  }, []);

  const closeToast = useCallback(() => setToast(null), []);
  const remove = useCallback((slug: string) => write((prev) => prev.filter((l) => l.slug !== slug)), []);
  const clear = useCallback(() => write(() => []), []);

  const value: BagContextValue = {
    items,
    count,
    subtotalPaise,
    shippingPaise,
    toFreeShippingPaise,
    freeFromPaise: shipping.freeFromPaise,
    add,
    setQuantity,
    remove,
    clear,
    open,
    setOpen,
    ready,
    bump,
  };

  return (
    <BagContext.Provider value={value}>
      {children}
      <BagToast
        toast={toast}
        onClose={closeToast}
        onViewBag={() => {
          setToast(null);
          setOpen(true);
        }}
        count={count}
        subtotalPaise={subtotalPaise}
      />
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[70]">
        <AnimatePresence>
          {flights.map((f) => {
            const w = Math.min(f.from.width, 120);
            const h = w * (f.from.height / f.from.width);
            const sx = f.from.left + f.from.width / 2 - w / 2;
            const sy = f.from.top + f.from.height / 2 - h / 2;
            const tx = f.to.left + f.to.width / 2 - w / 2;
            const ty = f.to.top + f.to.height / 2 - h / 2;
            return (
              <motion.img
                key={f.id}
                src={f.src}
                alt=""
                className="absolute top-0 left-0 rounded-[2px] shadow-lg"
                style={{ width: w, height: h }}
                initial={{ x: sx, y: sy, scale: 1, rotate: 0, opacity: 1 }}
                animate={{
                  x: [sx, (sx + tx) / 2, tx],
                  y: [sy, Math.min(sy, ty) - 90, ty],
                  scale: [1, 0.7, 0.12],
                  rotate: [0, -8, -14],
                  opacity: [1, 1, 0.4],
                }}
                transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1], times: [0, 0.45, 1] }}
                onAnimationComplete={() => {
                  setFlights((all) => all.filter((x) => x.id !== f.id));
                  setBump((b) => b + 1);
                }}
              />
            );
          })}
        </AnimatePresence>
      </div>
    </BagContext.Provider>
  );
}

export function useBag() {
  const ctx = useContext(BagContext);
  if (!ctx) throw new Error("useBag must be used inside BagProvider");
  return ctx;
}
