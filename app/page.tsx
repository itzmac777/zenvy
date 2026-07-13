import Image from "next/image";
import { Button } from "@/components/Button";
import { HeroMap } from "@/components/HeroMap";
import { Icon } from "@/components/Icon";
import { MarketingHeader } from "@/components/MarketingHeader";
import { categories, landingProducts } from "@/data/catalog";

export default function HomePage() {
  return (
    <>
      <MarketingHeader />
      <main className="mx-auto max-w-[1400px] px-5 pb-12 md:px-7 xl:px-11">
        <section className="-mx-5 relative grid min-h-[604px] items-end overflow-hidden border-b border-line bg-paper px-5 py-10 md:-mx-7 md:min-h-[560px] md:items-center md:px-7 md:py-16 xl:-mx-11 xl:px-11">
          <HeroMap />
          <div className="relative z-10 max-w-[520px]">
            <h1 className="font-serif text-[clamp(42px,12vw,56px)] font-normal leading-[0.98] md:text-[clamp(48px,5.15vw,76px)]">
              Indoor football turf booking, made effortless.
            </h1>
            <p className="mt-6 max-w-[455px] text-[15px] leading-relaxed text-[#37332c] md:text-[17px]">
              Find the right field for your adult squad, compare amenities and peak slots, then reserve your match time in minutes.
            </p>
            <div className="mt-8 grid gap-3 md:flex md:gap-5">
              <Button href="#join">Book a turf</Button>
              <Button href="/dashboard" variant="secondary">
                Manage venue
              </Button>
            </div>
          </div>
        </section>

        <section id="turfs" className="mx-auto max-w-[1080px] py-14 md:py-16">
          <h2 className="font-serif text-[30px] font-normal leading-none md:text-[34px]">Choose your turf type</h2>
          <div className="scrollbar-none -mx-5 mt-6 overflow-x-auto px-5 md:mx-0 md:px-0">
            <div className="flex w-max gap-3 md:grid md:w-full md:grid-cols-5 md:gap-4">
              {categories.map((category, index) => (
                <a
                  key={category.label}
                  href={category.href}
                  className={`inline-flex min-h-[46px] min-w-[136px] items-center justify-center gap-2.5 border px-4 text-[11px] font-extrabold tracking-[0.01em] transition hover:-translate-y-px md:min-w-0 ${
                    index === 0 ? "border-olive bg-olive text-white" : "border-line bg-white/70 text-ink hover:border-[#b7ad9f] hover:bg-white"
                  }`}
                >
                  <Icon name={category.icon} className="h-4 w-4" />
                  {category.label}
                </a>
              ))}
            </div>
          </div>
        </section>

        <section id="slots" className="mx-auto max-w-[1080px] pb-16 md:pb-20">
          <div className="mb-6 flex items-end justify-between gap-6 md:mb-8">
            <h2 className="font-serif text-[34px] font-normal leading-none md:text-[38px]">Available turfs</h2>
            <a href="#all" className="inline-flex items-center gap-2 text-[12px] font-extrabold tracking-[0.01em]">
              View schedule <span aria-hidden="true">-&gt;</span>
            </a>
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 md:gap-x-8 md:gap-y-11 xl:grid-cols-4">
            {landingProducts.map((product) => (
              <article key={product.id} className="group min-w-0">
                <Image src={product.image} alt={product.alt} width={700} height={700} className="aspect-square w-full bg-[#efe8dd] object-cover transition duration-300 group-hover:brightness-[0.97]" />
                <div className="pt-3">
                  <p className="truncate text-[9px] font-extrabold uppercase tracking-[0.13em] text-muted">{product.brand}</p>
                  <h3 className="mt-1 font-serif text-[16px] font-normal leading-tight md:text-[18px]">{product.name}</h3>
                  <div className="mt-2 flex items-center gap-2 text-[11px] tracking-[0.08em]">
                    <span aria-label="5 star rating">★★★★★</span>
                    <span className="text-[11px] tracking-normal text-muted">{product.ratingCount}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[13px] md:text-sm">
                    <strong className="text-[17px] leading-none md:text-[18px]">{product.price}</strong>
                    <span className="inline-flex min-h-5 items-center whitespace-nowrap rounded-full bg-[#eee8dd] px-2 text-[9px] font-bold text-muted">
                      {product.terms}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="join" className="grid gap-7 bg-[linear-gradient(90deg,rgba(55,62,43,0.96),rgba(55,62,43,0.88)),url('https://images.unsplash.com/photo-1589473912320-53d690064e06?auto=format&fit=crop&w=1600&q=84')] bg-cover bg-center p-7 text-white md:grid-cols-[1fr_auto] md:items-center md:p-10 xl:px-20">
          <div>
            <h2 className="max-w-md font-serif text-[34px] font-normal leading-tight md:text-[38px]">Ready to get your squad on the pitch?</h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/80">Reserve the right indoor football turf for your next adult game, league night, or team session.</p>
          </div>
          <div className="grid gap-3 md:flex md:gap-5">
            <Button href="#start" variant="light">
              Pick a slot
            </Button>
            <Button href="#leagues" variant="outline">
              Plan a league
            </Button>
          </div>
        </section>
      </main>
    </>
  );
}
