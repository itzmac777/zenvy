"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { MobileMenu } from "@/components/MobileMenu";
import { cn } from "@/lib/utils";

const sellerLinks = [
  { label: "Overview", href: "/dashboard" },
  { label: "Orders", href: "/orders" },
  { label: "Products", href: "/products" },
  { label: "Analytics", href: "/analytics" },
];

export function SellerHeader({ context = "Seller workspace" }: { context?: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-line/90 bg-paper/95 backdrop-blur-xl">
      <nav className="mx-auto grid min-h-16 max-w-[1400px] grid-cols-[auto_1fr_auto] items-center gap-3 px-5 md:min-h-[78px] md:grid-cols-[auto_auto_1fr_auto] md:gap-7 md:px-7 xl:px-11">
        <Link href="/" aria-label="Zenvy home" className="font-serif text-[32px] leading-none md:text-[40px]">
          Zenvy
        </Link>
        <div className="min-w-0 border-l border-line pl-3 md:pl-6">
          <span className="block truncate text-sm font-bold">Haven & Fold</span>
          <small className="hidden text-xs text-muted md:block">{context}</small>
        </div>
        <div className="hidden justify-center gap-2 md:flex">
          {sellerLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={cn(
                "inline-flex min-h-9 items-center rounded-full px-4 text-[13px] font-bold text-muted",
                pathname === link.href && "bg-[#eee8dd] text-ink",
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="hidden items-center justify-end gap-2 md:flex">
          <button className="grid h-[42px] w-[42px] place-items-center rounded-[7px] border border-line bg-white/70" aria-label="Search" type="button">
            <Icon name="search" />
          </button>
          <button className="grid h-[42px] w-[42px] place-items-center rounded-[7px] border border-line bg-white/70" aria-label="Notifications" type="button">
            <Icon name="bell" />
          </button>
          <Button href="/products">Add product</Button>
        </div>
        <div className="justify-self-end md:hidden">
          <MobileMenu
            items={[...sellerLinks, { label: "Create sale", href: "#" }, { label: "Add product", href: "/products" }]}
            ariaLabel="Open dashboard menu"
          />
        </div>
      </nav>
    </header>
  );
}
