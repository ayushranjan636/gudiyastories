import Link from "next/link";
import { Butterfly } from "@/components/motion/butterfly";

const POPULAR = [
  { href: "/books/kindness", label: "Books about kindness" },
  { href: "/books/age-6-8", label: "Ages 6 to 8" },
  { href: "/books/age-8-12", label: "Ages 8 to 12" },
  { href: "/books/mandala-colouring-books", label: "Mandala colouring books" },
  { href: "/for-schools", label: "For schools" },
];

export function NotFoundBody() {
  return (
    <div className="content-grid flex min-h-[70dvh] flex-col justify-center gap-5 py-24">
      <Butterfly flapping className="w-14 rotate-[-12deg]" />
      <h1 className="max-w-[20ch] text-h2">This page wandered off. The books are still here.</h1>
      <p>
        <Link href="/books" className="font-medium text-leaf underline decoration-lime decoration-2 underline-offset-4">
          See the books
        </Link>
      </p>
      <nav aria-label="Popular pages">
        <ul className="flex flex-wrap gap-2">
          {POPULAR.map((l) => (
            <li key={l.href}>
              <Link href={l.href as "/books"} className="inline-flex h-9 items-center rounded-full border border-line px-4 text-small hover:border-ink/40">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
