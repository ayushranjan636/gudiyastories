"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { Menu, X } from "lucide-react";
import { NAV } from "@/config/site";
import { useBag } from "@/features/bag/bag-context";
import { cn } from "@/lib/cn";

export function SiteHeader() {
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const reduceMotion = useReducedMotion();
  const pathname = usePathname();
  const { count, setOpen, bump, ready } = useBag();
  const menuRef = useRef<HTMLDialogElement>(null);

  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setScrolled(y > 8);
    if (reduceMotion) return;
    setHidden(y > 160 && y > prev + 2 ? true : y < prev - 2 ? false : hidden);
  });

  useEffect(() => {
    menuRef.current?.close();
  }, [pathname]);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[80] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
      >
        Skip to content
      </a>
      <motion.header
        className={cn(
          "sticky top-0 z-50 border-b transition-[background-color,border-color] duration-300",
          scrolled ? "border-line bg-paper/92 backdrop-blur-[2px]" : "border-transparent bg-paper",
        )}
        animate={{ y: hidden ? "-100%" : "0%" }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="content-grid flex h-16 items-center justify-between gap-6 md:h-[4.5rem]">
          <Link href="/" className="group flex items-center gap-3" aria-label="Gudiya Stories, home">
            <Image
              src="/brand/gudiya-stories-mark.png"
              alt=""
              width={667}
              height={490}
              preload
              className="h-10 w-auto transition-transform duration-500 ease-page group-hover:-rotate-3 md:h-11"
            />
            <span className="font-display text-[1.2rem] leading-none tracking-tight">Gudiya Stories</span>
          </Link>

          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {NAV.map((n) => {
                const active = pathname === n.href || pathname.startsWith(`${n.href}/`);
                return (
                  <li key={n.href}>
                    <Link
                      href={n.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative rounded-full px-3.5 py-2 text-small font-medium transition-colors hover:text-leaf",
                        active && "text-leaf",
                      )}
                    >
                      {n.label}
                      {active ? (
                        <motion.span
                          layoutId="nav-underline"
                          className="absolute inset-x-3.5 -bottom-0.5 h-[2px] rounded-full bg-lime"
                          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        />
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-1">
            <button
              id="bag-target"
              type="button"
              onClick={() => setOpen(true)}
              className="relative rounded-full px-3.5 py-2 text-small font-medium hover:bg-paper-deep"
            >
              Bag{" "}
              <motion.span
                key={bump}
                className="inline-block tabular-nums"
                initial={bump && !reduceMotion ? { y: -6, color: "#2F6B2A" } : false}
                animate={{ y: 0, color: "#1B1A17" }}
                transition={{ type: "spring", stiffness: 500, damping: 18 }}
              >
                ({ready ? count : 0})
              </motion.span>
            </button>
            <button
              type="button"
              className="grid size-10 place-items-center rounded-full hover:bg-paper-deep lg:hidden"
              onClick={() => menuRef.current?.showModal()}
            >
              <Menu className="size-5" strokeWidth={1.5} aria-hidden="true" />
              <span className="sr-only">Open menu</span>
            </button>
          </div>
        </div>
      </motion.header>

      <dialog ref={menuRef} aria-label="Menu" className="sheet-full lg:hidden">
        <div className="content-grid flex h-16 items-center justify-between">
          <span className="font-display text-[1.2rem]">Gudiya Stories</span>
          <button
            type="button"
            onClick={() => menuRef.current?.close()}
            className="-mr-2 grid size-10 place-items-center rounded-full hover:bg-paper-deep"
          >
            <X className="size-5" strokeWidth={1.5} aria-hidden="true" />
            <span className="sr-only">Close menu</span>
          </button>
        </div>
        <nav aria-label="Main" className="content-grid pt-8">
          <ul className="flex flex-col">
            {([{ href: "/", label: "Home" }, ...NAV] as const).map((n, i) => (
              <li key={n.href} className="menu-item border-b border-line" style={{ ["--i" as string]: i }}>
                <Link href={n.href} className="flex items-baseline justify-between py-4 font-display text-h3">
                  {n.label}
                  <span className="text-small text-ink-soft tabular-nums">0{i + 1}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-10 max-w-[30ch] text-ink-soft">A book doesn&apos;t need charging.</p>
        </nav>
      </dialog>
    </>
  );
}
