import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icon";
import { MarketingHeader } from "@/components/MarketingHeader";
import { TurfBookingClient } from "@/components/TurfBookingClient";
import { apiBaseUrl, type PublicField } from "@/lib/api";

export const dynamic = "force-dynamic";
type TurfPageProps = { params: Promise<{ id: string }> };

async function getField(id: string) {
  try {
    const response = await fetch(`${apiBaseUrl}/api/fields/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!response.ok) return null;
    const data = (await response.json()) as { field: PublicField };
    return data.field;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: TurfPageProps): Promise<Metadata> {
  const turf = await getField((await params).id);
  return turf ? { title: `${turf.name} | Zenvy`, description: turf.description } : { title: "Turf not found | Zenvy" };
}

export default async function TurfDetailsPage({ params }: TurfPageProps) {
  const turf = await getField((await params).id);
  if (!turf) notFound();
  const facts = [
    { icon: "field" as const, label: "Format", value: turf.format },
    { icon: "users" as const, label: "Capacity", value: `${turf.capacity} players` },
    { icon: "shield" as const, label: "Surface", value: turf.surface },
    { icon: "clock" as const, label: "Pitch size", value: turf.pitchSize },
  ];

  return (
    <>
      <MarketingHeader showAnnouncement={false} />
      <main className="mx-auto max-w-[1400px] px-5 pb-16 pt-6 md:px-7 md:pb-20 md:pt-8 xl:px-11">
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-muted">
          <Link href="/#slots" className="transition hover:text-ink">Available turfs</Link>
          <span aria-hidden="true">/</span>
          <span className="truncate text-ink">{turf.name}</span>
        </nav>

        <section className="grid gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(390px,0.72fr)] lg:items-start xl:gap-14">
          <article className="min-w-0 lg:col-start-1 lg:row-start-1">
            <div className="relative overflow-hidden bg-[#ece8df]">
              {turf.image ? (
                <Image src={turf.image} alt={turf.alt} width={1200} height={800} unoptimized className="aspect-[16/10] w-full object-cover" priority />
              ) : (
                <div className="grid aspect-[16/10] place-items-center"><Icon name="field" className="h-10 w-10 text-muted" /></div>
              )}
              <span className="absolute bottom-4 left-4 bg-[#fffefd]/94 px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink backdrop-blur-sm">{turf.terms}</span>
            </div>

            <div className="pt-7 md:pt-9">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
                <span className="font-extrabold uppercase tracking-[0.13em] text-muted">{turf.area}</span>
                <span className="flex items-center gap-2">
                  <span aria-label={`${turf.rating} out of 5 stars`} className="tracking-[0.08em]">★★★★★</span>
                  <span className="text-muted">{turf.rating}{turf.ratingCount ? ` (${turf.ratingCount} reviews)` : " · New"}</span>
                </span>
              </div>
              <h1 className="mt-3 max-w-[760px] font-serif text-[44px] font-normal leading-[0.98] md:text-[62px]">{turf.name}</h1>
              <p className="mt-4 flex items-center gap-2 text-sm text-muted"><Icon name="location" className="h-4 w-4 shrink-0" />{turf.location}</p>
              <dl className="mt-8 grid grid-cols-2 border-y border-line md:grid-cols-4">
                {facts.map((fact, index) => (
                  <div key={fact.label} className={`min-w-0 py-5 pr-3 ${index > 0 ? "md:border-l md:border-line md:pl-5" : ""} ${index % 2 === 1 ? "border-l border-line pl-4" : ""}`}>
                    <dt className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.11em] text-muted"><Icon name={fact.icon} className="h-4 w-4 text-olive" />{fact.label}</dt>
                    <dd className="mt-2 text-sm font-bold leading-tight">{fact.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-6 max-w-[760px] text-[16px] leading-[1.75] text-[#3f3a33] md:text-[17px]">{turf.description}</p>
            </div>
          </article>

          <TurfBookingClient turf={turf} />

          <div className="min-w-0 lg:col-start-1 lg:row-start-2">
            <section>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted">Included with every booking</p>
              <h2 className="mt-2 font-serif text-[30px] font-normal leading-none">Field amenities</h2>
              <ul className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                {turf.amenities.map((amenity) => (
                  <li key={amenity} className="flex items-center gap-3 border-b border-line/70 pb-3 text-sm font-semibold">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#eef0ff] text-olive-dark"><Icon name="check" className="h-3.5 w-3.5" /></span>{amenity}
                  </li>
                ))}
              </ul>
            </section>
            <section className="mt-9 border-t border-line pt-8">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h2 className="font-serif text-2xl font-normal">Arrival</h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted">Arrive 10 minutes before kickoff and keep your booking reference handy.</p>
                </div>
                <div>
                  <h2 className="font-serif text-2xl font-normal">Flexible plans</h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{turf.reschedulePolicy}</p>
                </div>
              </div>
            </section>
          </div>
        </section>
      </main>
    </>
  );
}
