"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { MobileMenu } from "@/components/MobileMenu";
import { PosDrawer } from "@/components/PosDrawer";
import { cn } from "@/lib/utils";

const sellerLinks = [
  { label: "Overview", href: "/dashboard" },
  { label: "Bookings", href: "/orders" },
  { label: "Turfs", href: "/products" },
  { label: "Analytics", href: "/analytics" },
];

export function SellerHeader({ context = "Venue workspace" }: { context?: string }) {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line/90 bg-paper/95 backdrop-blur-xl">
        <nav className="mx-auto grid min-h-16 max-w-[1400px] grid-cols-[auto_1fr_auto] items-center gap-3 px-5 md:min-h-[78px] md:grid-cols-[auto_auto_1fr_auto] md:gap-7 md:px-7 xl:px-11">
          <Link href="/" aria-label="Zenvy home" className="inline-flex items-center gap-2.5">
            <Image src="/zenvy-football-logo.png" alt="" width={44} height={44} className="h-10 w-10 rounded-full object-cover md:h-11 md:w-11" priority />
            <span className="font-serif text-[32px] leading-none md:text-[40px]">Zenvy</span>
          </Link>
          <div className="min-w-0 border-l border-line pl-3 md:pl-6">
            <span className="block truncate text-sm font-bold">Zenvy Central</span>
            <small className="hidden text-xs text-muted md:block">{context}</small>
          </div>
          <div className="hidden justify-center gap-2 md:flex">
            {sellerLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className={cn(
                  "inline-flex min-h-9 items-center px-4 text-[13px] font-bold text-muted",
                  pathname === link.href && "bg-[#eef0ff] text-ink",
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="hidden items-center justify-end gap-2 md:flex">
            <button className="grid h-[42px] w-[42px] place-items-center border border-line bg-white/70" aria-label="Search" type="button">
              <Icon name="search" />
            </button>
            <button className="grid h-[42px] w-[42px] place-items-center border border-line bg-white/70" aria-label="Notifications" type="button">
              <Icon name="bell" />
            </button>
            <Button href="?pos=open" variant="secondary">
              New booking
            </Button>
            <Button href="/products/new">Add turf</Button>
          </div>
          <div className="justify-self-end md:hidden">
            <MobileMenu
              items={[...sellerLinks, { label: "New booking", href: "?pos=open" }, { label: "Add turf", href: "/products/new" }]}
              ariaLabel="Open dashboard menu"
            />
          </div>
        </nav>
      </header>
      <Suspense fallback={null}>
        <PosDrawer />
      </Suspense>
    </>
  );
}
