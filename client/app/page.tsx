import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/Button";
import { HeroMap } from "@/components/HeroMap";
import { Icon } from "@/components/Icon";
import { MarketingHeader } from "@/components/MarketingHeader";
import { categories } from "@/data/catalog";
import { apiBaseUrl, type PublicField } from "@/lib/api";

export const dynamic = "force-dynamic";

async function getFields() {
  try {
    const response = await fetch(`${apiBaseUrl}/api/fields`, { cache: "no-store" });
    if (!response.ok) return [];
    const data = (await response.json()) as { fields: PublicField[] };
    return data.fields;
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const fields = await getFields();
  return (
    <>
      <MarketingHeader />
      <main className="mx-auto max-w-[1400px] px-5 pb-12 md:px-7 xl:px-11">
        <section className="-mx-5 relative grid min-h-[604px] items-end overflow-hidden border-b border-line bg-paper px-5 py-10 md:-mx-7 md:min-h-[560px] md:items-center md:px-7 md:py-16 xl:-mx-11 xl:px-11">
          <HeroMap />
          <div className="relative z-10 max-w-[520px]">
            <h1 className="font-serif text-[clamp(42px,12vw,56px)] font-normal leading-[0.98] md:text-[clamp(48px,5.15vw,76px)]">Indoor football turf booking, made effortless.</h1>
            <p className="mt-6 max-w-[455px] text-[15px] leading-relaxed text-[#37332c] md:text-[17px]">Find the right field for your adult squad, compare amenities and peak slots, then reserve your match time in minutes.</p>
            <div className="mt-8 grid gap-3 md:flex md:gap-5"><Button href="#slots">Book a turf</Button><Button href="/manager/login" variant="secondary">List your field</Button></div>
          </div>
        </section>

        <section id="turfs" className="mx-auto max-w-[1080px] py-14 md:py-16">
          <h2 className="font-serif text-[30px] font-normal leading-none md:text-[34px]">Choose your turf type</h2>
          <div className="scrollbar-none -mx-5 mt-6 overflow-x-auto px-5 md:mx-0 md:px-0"><div className="flex w-max gap-3 md:grid md:w-full md:grid-cols-5 md:gap-4">{categories.map((category, index) => <a key={category.label} href={category.href} className={`inline-flex min-h-[46px] min-w-[136px] items-center justify-center gap-2.5 border px-4 text-[11px] font-extrabold tracking-[0.01em] transition hover:-translate-y-px md:min-w-0 ${index === 0 ? "border-olive bg-olive text-white" : "border-line bg-white/70 text-ink hover:border-[#b7ad9f] hover:bg-white"}`}><Icon name={category.icon} className="h-4 w-4" />{category.label}</a>)}</div></div>
        </section>

        <section id="slots" className="mx-auto max-w-[1080px] pb-16 md:pb-20">
          <div className="mb-6 flex items-end justify-between gap-6 md:mb-8"><h2 className="font-serif text-[34px] font-normal leading-none md:text-[38px]">Available turfs</h2><a href="#slots" className="inline-flex items-center gap-2 text-[12px] font-extrabold tracking-[0.01em]">Live schedule <span aria-hidden="true">-&gt;</span></a></div>
          {fields.length ? <div className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 md:gap-x-8 md:gap-y-11 xl:grid-cols-4">{fields.map((field) => <article key={field.id} className="group min-w-0 transition duration-300 ease-out hover:-translate-y-1"><Link href={`/turfs/${field.slug}`} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-olive"><div className="relative overflow-hidden border border-transparent bg-[#efe8dd] transition duration-300 group-hover:border-line group-hover:shadow-[0_18px_42px_rgba(23,22,19,0.12)]">{field.image ? <Image src={field.image} alt={field.alt} width={700} height={700} unoptimized className="aspect-square w-full object-cover transition duration-500 ease-out group-hover:scale-[1.035] group-hover:brightness-[0.96]" /> : <div className="grid aspect-square place-items-center"><Icon name="field" className="h-8 w-8 text-muted" /></div>}<span className="absolute right-3 top-3 grid h-9 w-9 translate-y-1 place-items-center rounded-full bg-white text-ink opacity-0 shadow-[0_8px_24px_rgba(23,22,19,0.14)] transition duration-300 group-hover:translate-y-0 group-hover:opacity-100"><Icon name="arrow-right" className="h-4 w-4" /></span></div><div className="pt-3"><p className="truncate text-[9px] font-extrabold uppercase tracking-[0.13em] text-muted">{field.area}</p><h3 className="mt-1 font-serif text-[16px] font-normal leading-tight transition-colors group-hover:text-olive-dark md:text-[18px]">{field.name}</h3><div className="mt-2 flex items-center gap-2 text-[11px] tracking-[0.08em]"><span aria-label={`${field.rating} out of 5 stars`}>★★★★★</span><span className="tracking-normal text-muted">{field.rating}{field.ratingCount ? ` (${field.ratingCount})` : " · New"}</span></div><div className="mt-2 flex items-center justify-between gap-2 text-[13px] md:text-sm"><strong className="text-[17px] leading-none md:text-[18px]">{field.price}</strong><span className="inline-flex min-h-5 items-center whitespace-nowrap rounded-full bg-[#eee8dd] px-2 text-[9px] font-bold text-muted">{field.terms}</span></div></div></Link></article>)}</div> : <div className="border border-line bg-white/70 p-8 text-center text-sm text-muted">The live field catalog is starting up. Refresh once the Zenvy server is online.</div>}
        </section>

        <section id="join" className="grid gap-7 bg-[linear-gradient(90deg,rgba(55,62,43,0.96),rgba(55,62,43,0.88)),url('https://images.unsplash.com/photo-1589473912320-53d690064e06?auto=format&fit=crop&w=1600&q=84')] bg-cover bg-center p-7 text-white md:grid-cols-[1fr_auto] md:items-center md:p-10 xl:px-20"><div><h2 className="max-w-md font-serif text-[34px] font-normal leading-tight md:text-[38px]">Ready to get your squad on the pitch?</h2><p className="mt-4 max-w-md text-sm leading-relaxed text-white/80">Reserve the right indoor football turf for your next adult game, league night, or team session.</p></div><div className="grid gap-3 md:flex md:gap-5"><Button href="#slots" variant="light">Pick a slot</Button><Button href="/#leagues" variant="outline">Plan a league</Button></div></section>
      </main>
    </>
  );
}
