"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  BookOpen,
  Boxes,
  Building2,
  ExternalLink,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareQuote,
  NotebookPen,
  Package,
  Settings,
  Ticket,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { logout } from "../login/actions";

type Counts = { toPack: number; newEnquiries: number; pendingReviews: number };

export function AdminNav({ admin, counts }: { admin: { name: string; role: string }; counts: Counts }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/orders", label: "Orders", icon: Package, count: counts.toPack },
    { href: "/admin/products", label: "Products", icon: BookOpen },
    { href: "/admin/inventory", label: "Inventory", icon: Boxes },
    { href: "/admin/classes", label: "Classes", icon: GraduationCap },
    { href: "/admin/blog", label: "Blog", icon: NotebookPen },
    { href: "/admin/enquiries", label: "Bulk enquiries", icon: Building2, count: counts.newEnquiries },
    { href: "/admin/customers", label: "Customers", icon: Users },
    { href: "/admin/coupons", label: "Coupons", icon: Ticket },
    { href: "/admin/reviews", label: "Reviews", icon: MessageSquareQuote, count: counts.pendingReviews },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    ...(admin.role === "OWNER" ? [{ href: "/admin/settings", label: "Settings", icon: Settings }] : []),
  ];

  const nav = (
    <nav aria-label="Admin" className="flex h-full flex-col">
      <Link href="/admin" className="flex items-center gap-2.5 px-3 py-4">
        <Image src="/brand/gudiya-stories-mark.png" alt="" width={667} height={490} className="h-8 w-auto" />
        <span className="font-display leading-none">Gudiya Stories</span>
      </Link>
      <ul className="mt-2 flex-1 space-y-0.5">
        {items.map(({ href, label, icon: Icon, count }) => {
          const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href as "/admin"}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-small transition-colors",
                  active ? "bg-ink text-paper" : "text-ink hover:bg-paper-deep",
                )}
              >
                <Icon className="size-4" strokeWidth={1.5} aria-hidden="true" />
                <span className="flex-1">{label}</span>
                {count ? (
                  <span className={cn("rounded-full px-1.5 text-[0.7rem] font-semibold tabular-nums", active ? "bg-paper/20" : "bg-lime/40")}>{count}</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="space-y-1 border-t border-line pt-3">
        <a href="/" target="_blank" className="flex items-center gap-3 rounded-lg px-3 py-2 text-small hover:bg-paper-deep">
          <ExternalLink className="size-4" strokeWidth={1.5} aria-hidden="true" /> View site
        </a>
        <form action={logout}>
          <button type="submit" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-small hover:bg-paper-deep">
            <LogOut className="size-4" strokeWidth={1.5} aria-hidden="true" /> Sign out
          </button>
        </form>
        <p className="px-3 pt-2 text-[0.75rem] text-ink-soft">
          {admin.name} · {admin.role === "OWNER" ? "Owner" : "Staff"}
        </p>
      </div>
    </nav>
  );

  return (
    <>
      <div className="flex items-center justify-between border-b border-line px-5 py-3 lg:hidden">
        <span className="font-display">Admin</span>
        <button type="button" onClick={() => setOpen(true)} className="grid size-10 place-items-center rounded-full hover:bg-paper-deep">
          <Menu className="size-5" strokeWidth={1.5} aria-hidden="true" />
          <span className="sr-only">Open admin menu</span>
        </button>
      </div>
      <aside className="sticky top-0 hidden h-dvh border-r border-line bg-paper-deep/50 px-3 pb-4 lg:block">{nav}</aside>
      {open ? (
        <div className="fixed inset-0 z-50 bg-ink/30 lg:hidden" onClick={() => setOpen(false)}>
          <aside className="h-full w-72 bg-paper px-3 pb-4" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setOpen(false)} className="absolute top-3 left-60 grid size-10 place-items-center rounded-full">
              <X className="size-5" strokeWidth={1.5} aria-hidden="true" />
              <span className="sr-only">Close</span>
            </button>
            {nav}
          </aside>
        </div>
      ) : null}
    </>
  );
}
