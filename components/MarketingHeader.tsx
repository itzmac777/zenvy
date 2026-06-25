import Link from "next/link";
import { Button } from "@/components/Button";
import { MobileMenu } from "@/components/MobileMenu";

const marketingLinks = [
  { label: "Categories", href: "#categories" },
  { label: "New", href: "#new" },
  { label: "Best Sellers", href: "#bestsellers" },
  { label: "Brands", href: "#brands" },
  { label: "Resources", href: "#resources" },
];

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-paper/95 backdrop-blur-xl">
      <div className="grid min-h-[34px] place-items-center bg-gradient-to-r from-[#efe7db] via-[#f7f2ea] to-[#eee5d8] px-5 py-2 text-center text-[11px] text-[#25231f] md:min-h-[46px] md:text-sm">
        Source wholesale from 20,000+ independent brands.
      </div>
      <nav className="mx-auto grid min-h-[62px] max-w-[1400px] grid-cols-[auto_auto] items-center gap-4 px-5 md:min-h-[72px] md:grid-cols-[auto_1fr_auto] md:px-7 xl:px-11">
        <Link href="/" aria-label="Zenvy home" className="font-serif text-[32px] leading-none md:text-[40px]">
          Zenvy
        </Link>
        <div className="hidden items-center gap-8 text-sm md:flex">
          {marketingLinks.map((link) => (
            <Link key={link.label} href={link.href} className="whitespace-nowrap">
              {link.label}
            </Link>
          ))}
        </div>
        <div className="hidden items-center justify-end gap-7 text-sm md:flex">
          <Link href="/dashboard">Sell on Zenvy</Link>
          <Link href="#signin">Sign in</Link>
          <Button href="#join">Get started</Button>
        </div>
        <div className="justify-self-end md:hidden">
          <MobileMenu
            items={[...marketingLinks, { label: "Sell on Zenvy", href: "/dashboard" }, { label: "Sign in", href: "#signin" }]}
            cta={{ label: "Get started", href: "#join" }}
          />
        </div>
      </nav>
    </header>
  );
}
