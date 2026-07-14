import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/Button";
import { MobileMenu } from "@/components/MobileMenu";

const marketingLinks = [
  { label: "Turfs", href: "/#turfs" },
  { label: "Bookings", href: "/booking/inquiry" },
];

type MarketingHeaderProps = {
  showAnnouncement?: boolean;
};

export function MarketingHeader({ showAnnouncement = true }: MarketingHeaderProps) {
  return (
    <header className="relative z-30 border-b border-line/80 bg-paper/95 backdrop-blur-xl">
      {showAnnouncement ? (
        <div className="grid min-h-[34px] place-items-center bg-gradient-to-r from-[#efe7db] via-[#f7f2ea] to-[#eee5d8] px-5 py-2 text-center text-[11px] text-[#25231f] md:min-h-[46px] md:text-sm">
          Book indoor football turfs for adult games, leagues, and team nights.
        </div>
      ) : null}
      <nav className="mx-auto grid min-h-[62px] max-w-[1400px] grid-cols-[auto_auto] items-center gap-4 px-5 md:min-h-[72px] md:grid-cols-[auto_1fr_auto] md:px-7 xl:px-11">
        <Link href="/" aria-label="Zenvy home" className="inline-flex items-center gap-2.5">
          <Image src="/zenvy-football-logo.png" alt="" width={44} height={44} className="h-10 w-10 rounded-full object-cover md:h-11 md:w-11" priority />
          <span className="font-serif text-[32px] leading-none md:text-[40px]">Zenvy</span>
        </Link>
        <div className="hidden items-center gap-8 text-sm md:flex">
          {marketingLinks.map((link) => (
            <Link key={link.label} href={link.href} className="whitespace-nowrap">
              {link.label}
            </Link>
          ))}
        </div>
        <div className="hidden items-center justify-end gap-7 text-sm md:flex">
          <Link href="/manager/login">List your field</Link>
          <Link href="/manager/login">Manager sign in</Link>
          <Button href="/#slots">Book a turf</Button>
        </div>
        <div className="justify-self-end md:hidden">
          <MobileMenu
            items={[...marketingLinks, { label: "List your field", href: "/manager/login" }, { label: "Manager sign in", href: "/manager/login" }]}
            cta={{ label: "Book a turf", href: "/#slots" }}
          />
        </div>
      </nav>
    </header>
  );
}
