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
        className="grid h-[42px] w-[42px] place-items-center border border-line bg-[#fcfaf6] text-ink shadow-[0_8px_18px_rgba(38,35,30,0.06)]"
      >
        <Icon name="menu" />
      </button>
      {open ? (
        <div className="absolute right-0 top-[calc(100%+12px)] z-50 grid w-[min(320px,calc(100vw-40px))] gap-1 border border-line bg-[#fcfaf6] p-3 shadow-[0_26px_70px_rgba(23,22,19,0.22)] ring-1 ring-white/70">
          {items.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex min-h-[42px] items-center px-3 text-sm font-semibold hover:bg-[#f0ebe4]"
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
