import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { MarketingHeader } from "@/components/MarketingHeader";
import { PublicFieldListings } from "@/components/PublicFieldListings";
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
        <section id="turfs" className="mx-auto max-w-[1080px] py-10 md:py-14">
          <h2 className="font-serif text-[30px] font-normal leading-none md:text-[34px]">Choose your turf type</h2>
          <div className="scrollbar-none -mx-5 mt-6 overflow-x-auto px-5 md:mx-0 md:px-0"><div className="flex w-max gap-3 md:grid md:w-full md:grid-cols-5 md:gap-4">{categories.map((category, index) => <a key={category.label} href={category.href} className={`inline-flex min-h-[46px] min-w-[136px] items-center justify-center gap-2.5 border px-4 text-[11px] font-extrabold tracking-[0.01em] transition hover:-translate-y-px md:min-w-0 ${index === 0 ? "border-olive bg-olive text-white" : "border-line bg-white/70 text-ink hover:border-[#b7ad9f] hover:bg-white"}`}><Icon name={category.icon} className="h-4 w-4" />{category.label}</a>)}</div></div>
        </section>

        <section id="slots" className="mx-auto max-w-[1080px] pb-16 md:pb-20">
          <PublicFieldListings fields={fields} />
        </section>

        <section id="join" className="grid gap-7 bg-[linear-gradient(90deg,rgba(55,62,43,0.96),rgba(55,62,43,0.88)),url('https://images.unsplash.com/photo-1589473912320-53d690064e06?auto=format&fit=crop&w=1600&q=84')] bg-cover bg-center p-7 text-white md:grid-cols-[1fr_auto] md:items-center md:p-10 xl:px-20"><div><h2 className="max-w-md font-serif text-[34px] font-normal leading-tight md:text-[38px]">Ready to get your squad on the pitch?</h2><p className="mt-4 max-w-md text-sm leading-relaxed text-white/80">Reserve the right indoor football turf for your next adult game, league night, or team session.</p></div><div className="grid gap-3 md:flex md:gap-5"><Button href="#slots" variant="light">Pick a slot</Button><Button href="/#leagues" variant="outline">Plan a league</Button></div></section>
      </main>
    </>
  );
}
