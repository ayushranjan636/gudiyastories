import Link from "next/link";
import type { Route } from "next";
import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

export const buttonStyles = cva(
  [
    "inline-flex items-center justify-center gap-2 rounded-full font-medium",
    "transition-[background-color,color,box-shadow,transform] duration-200 ease-page",
    "disabled:pointer-events-none disabled:opacity-50",
    "active:translate-y-px",
  ],
  {
    variants: {
      variant: {
        // Primary: --leaf on paper. White on #2F6B2A is 6.45:1.
        primary: "bg-leaf text-white hover:bg-leaf-deep",
        // Secondary: outlined, ink on paper.
        secondary: "border border-ink/80 text-ink hover:bg-paper-deep",
        // Quiet: for tertiary actions on cards.
        quiet: "bg-paper-deep text-ink hover:bg-line",
        // Text link with the lime decoration underline.
        text: [
          "rounded-sm px-0 text-leaf underline decoration-lime decoration-2 underline-offset-[6px]",
          "hover:decoration-leaf",
        ],
      },
      size: {
        sm: "h-10 px-4 text-small",
        md: "h-12 px-6 text-body",
        lg: "h-14 px-8 text-body",
      },
    },
    compoundVariants: [{ variant: "text", className: "h-auto px-0" }],
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonVariants = VariantProps<typeof buttonStyles>;

export function Button({ className, variant, size, type = "button", ...props }: ComponentProps<"button"> & ButtonVariants) {
  return <button type={type} className={cn(buttonStyles({ variant, size }), className)} {...props} />;
}

export function ButtonLink<T extends string>({
  className,
  variant,
  size,
  href,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & ButtonVariants & { href: Route<T> }) {
  return <Link href={href} className={cn(buttonStyles({ variant, size }), className)} {...props} />;
}
