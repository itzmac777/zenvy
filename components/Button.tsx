import Link from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "light" | "outline";

const variants: Record<ButtonVariant, string> = {
  primary: "border-transparent bg-olive text-white shadow-[inset_0_-1px_0_rgba(0,0,0,0.16)] hover:bg-olive-dark",
  secondary: "border-[#9f988c] bg-white/70 text-ink hover:bg-white",
  light: "border-transparent bg-white text-ink hover:bg-panel",
  outline: "border-white/70 bg-white/[0.04] text-white hover:bg-white/10",
};

type ButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  href: string;
  variant?: ButtonVariant;
};

export function Button({ children, className, href, variant = "primary", ...props }: ButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-[7px] border px-6 text-sm font-bold transition hover:-translate-y-px",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
