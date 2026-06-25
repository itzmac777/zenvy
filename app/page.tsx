import Image from "next/image";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { MarketingHeader } from "@/components/MarketingHeader";
import { categories, landingProducts } from "@/data/catalog";

export default function HomePage() {
  return (
    <>
      <MarketingHeader />
      <main className="mx-auto max-w-[1400px] px-5 pb-12 md:px-7 xl:px-11">
        <section className="-mx-5 grid min-h-[604px] items-end border-b border-line bg-[linear-gradient(0deg,rgba(252,250,246,0.98)_0%,rgba(252,250,246,0.9)_47%,rgba(252,250,246,0.16)_100%),url('https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=1100&q=86')] bg-cover bg-center-top px-5 py-10 md:-mx-7 md:min-h-[560px] md:items-center md:bg-[linear-gradient(90deg,rgba(252,250,246,0.98)_0%,rgba(252,250,246,0.95)_31%,rgba(252,250,246,0.47)_51%,rgba(252,250,246,0.04)_100%),url('https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=2200&q=88')] md:bg-center md:px-7 md:py-16 xl:-mx-11 xl:px-11">
          <div className="max-w-[520px]">
            <h1 className="font-serif text-[clamp(42px,12vw,56px)] font-normal leading-[0.98] md:text-[clamp(48px,5.15vw,76px)]">
              Wholesale made effortless for modern retailers.
            </h1>
            <p className="mt-6 max-w-[455px] text-[15px] leading-relaxed text-[#37332c] md:text-[17px]">
              Discover independent brands, enjoy flexible ordering with net terms, and restock your bestsellers with ease.
            </p>
            <div className="mt-8 grid gap-3 md:flex md:gap-5">
              <Button href="#join">Shop wholesale</Button>
              <Button href="/dashboard" variant="secondary">
                Sell on Zenvy
              </Button>
            </div>
          </div>
        </section>

        <section className="grid border-b border-line py-9 md:grid-cols-3">
          {[
            { icon: "card" as const, title: "Flexible payment terms", copy: "Choose net 60 terms or pay on your schedule, built for your business." },
            { icon: "tag" as const, title: "Curated products for every store", copy: "Handpicked goods from independent brands your customers will love." },
            { icon: "box" as const, title: "Easy returns and fast reorders", copy: "Hassle-free first orders and a seamless reorder experience." },
          ].map((item) => (
            <article key={item.title} className="grid grid-cols-[54px_minmax(0,1fr)] gap-4 border-b border-line py-5 last:border-b-0 md:grid-cols-[64px_minmax(0,1fr)] md:border-b-0 md:border-r md:px-8 md:last:border-r-0">
              <span className="grid h-[50px] w-[50px] place-items-center rounded-full bg-[#f0ebe4] text-olive md:h-[58px] md:w-[58px]">
                <Icon name={item.icon} />
              </span>
              <div>
                <h2 className="mt-1 text-base font-bold leading-snug">{item.title}</h2>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">{item.copy}</p>
              </div>
            </article>
          ))}
        </section>

        <section id="categories" className="grid gap-7 py-14 md:grid-cols-[260px_minmax(0,1fr)] md:items-center md:gap-16">
          <div className="font-serif text-[32px] leading-none">
            <p>Explore top</p>
            <h2 className="font-normal">categories</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-5 md:gap-5">
            {categories.map((category, index) => (
              <a
                key={category.label}
                href={category.href}
                className={`inline-flex min-h-[60px] items-center justify-center gap-2.5 rounded-[7px] border px-3 text-[13px] font-bold ${
                  index === 0 ? "border-[#6e6a60] bg-[#faf7f1]" : "border-line bg-white/80"
                }`}
              >
                <Icon name={category.icon} />
                {category.label}
              </a>
            ))}
          </div>
        </section>

        <section id="bestsellers" className="pb-14">
          <div className="mb-7 flex items-end justify-between gap-6">
            <h2 className="font-serif text-[34px] font-normal leading-none">Bestsellers</h2>
            <a href="#all" className="text-sm font-bold">
              View all bestsellers -&gt;
            </a>
          </div>
          <div className="grid gap-5 md:grid-cols-3 xl:grid-cols-4">
            {landingProducts.map((product) => (
              <article key={product.id} className="overflow-hidden rounded-[7px] border border-line bg-white">
                <Image src={product.image} alt={product.alt} width={700} height={700} className="aspect-square w-full object-cover" />
                <div className="min-h-32 p-4">
                  <p className="text-[13px] text-muted">{product.brand}</p>
                  <h3 className="mt-1 text-[15px] font-bold leading-snug">{product.name}</h3>
                  <div className="mt-2 text-xs tracking-wide">
                    ★★★★★ <span className="ml-2 text-muted">{product.ratingCount}</span>
                  </div>
                  <div className="mt-3 flex justify-between gap-3 text-[13px]">
                    <strong>{product.price}</strong>
                    <span className="text-muted">{product.terms}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mb-8 grid overflow-hidden rounded-[7px] border border-line/70 bg-gradient-to-br from-[#fbf8f2] to-[#f5f0e8] shadow-soft md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <blockquote className="border-b border-line p-7 font-serif text-xl leading-relaxed md:border-b-0 md:p-10">
            “Zenvy is an essential partner for our shop. The brands are incredible, the terms are fair, and reordering is so simple.”
            <cite className="mt-5 block font-sans text-xs not-italic text-muted">Julia Park, Owner: Haven & Fold</cite>
          </blockquote>
          {[
            { icon: "tag" as const, value: "20,000+", label: "Independent brands" },
            { icon: "users" as const, value: "500k+", label: "Retailers worldwide" },
            { icon: "calendar" as const, value: "Net 60", label: "Flexible payment terms" },
          ].map((metric) => (
            <div key={metric.label} className="grid min-h-40 place-items-center gap-2 border-t border-line p-6 text-center md:border-l md:border-t-0">
              <Icon name={metric.icon} className="text-olive" />
              <strong className="font-serif text-[34px] font-normal leading-none">{metric.value}</strong>
              <span className="text-xs text-muted">{metric.label}</span>
            </div>
          ))}
        </section>

        <section id="join" className="grid gap-7 rounded-[7px] bg-[linear-gradient(90deg,rgba(55,62,43,0.96),rgba(55,62,43,0.88)),url('https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1600&q=84')] bg-cover bg-center p-7 text-white md:grid-cols-[1fr_auto] md:items-center md:p-10 xl:px-20">
          <div>
            <h2 className="max-w-md font-serif text-[34px] font-normal leading-tight md:text-[38px]">Ready to grow your shelf with Zenvy?</h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/80">Join thousands of retailers finding the best independent brands in one place.</p>
          </div>
          <div className="grid gap-3 md:flex md:gap-5">
            <Button href="#start" variant="light">
              Get started
            </Button>
            <Button href="#brands" variant="outline">
              Browse brands
            </Button>
          </div>
        </section>
      </main>
    </>
  );
}
