"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";

type MenuItem = {
  label: string;
  href: string;
};

type MobileMenuProps = {
  items: MenuItem[];
  cta?: MenuItem;
  ariaLabel?: string;
};

export function MobileMenu({ items, cta, ariaLabel = "Open navigation menu" }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="grid h-[42px] w-[42px] place-items-center rounded-[7px] border border-line bg-white/70 text-ink"
      >
        <Icon name="menu" />
      </button>
      {open ? (
        <div className="absolute right-0 top-[calc(100%+12px)] z-40 grid w-[min(320px,calc(100vw-40px))] gap-1 rounded-[7px] border border-line bg-paper/98 p-3 shadow-menu">
          {items.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex min-h-[42px] items-center rounded-md px-3 text-sm font-semibold hover:bg-[#f0ebe4]"
            >
              {item.label}
            </Link>
          ))}
          {cta ? (
            <Button href={cta.href} onClick={() => setOpen(false)} className="mt-1 w-full">
              {cta.label}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
