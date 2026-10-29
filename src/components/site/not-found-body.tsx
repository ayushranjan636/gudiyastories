import Link from "next/link";
import { Butterfly } from "@/components/motion/butterfly";

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
    </div>
  );
}
