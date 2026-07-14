"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BdtAmount } from "@/components/BdtAmount";
import { Icon } from "@/components/Icon";
import type { PublicField } from "@/lib/api";

function searchableText(field: PublicField) {
  return [
    field.name,
    field.area,
    field.city,
    field.address,
    field.format,
    field.surface,
    field.description,
    field.pitchSize,
    ...field.amenities,
  ].join(" ").toLowerCase();
}

function compactPrice(price: string) {
  return price.replace(/^BDT\s*/i, "").replace("/hr", "/h");
}

export function PublicFieldListings({ fields }: { fields: PublicField[] }) {
  const [query, setQuery] = useState("");
  const trimmedQuery = query.trim().toLowerCase();
  const filteredFields = useMemo(() => {
    if (!trimmedQuery) return fields;
    return fields.filter((field) => searchableText(field).includes(trimmedQuery));
  }, [fields, trimmedQuery]);

  if (!fields.length) {
    return <div className="border border-line bg-white/70 p-8 text-center text-sm text-muted">The live field catalog is starting up. Refresh once the Zenvy server is online.</div>;
  }

  return (
    <div className="grid gap-7">
      <form role="search" onSubmit={(event) => event.preventDefault()} className="grid gap-2">
        <label htmlFor="turf-search" className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted">Search turfs</label>
        <div className="flex min-h-12 items-center gap-3 border border-line bg-white/80 px-4 transition focus-within:border-olive focus-within:bg-white">
          <Icon name="search" className="h-[18px] w-[18px] shrink-0 text-olive" />
          <input
            id="turf-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by field, area, format, surface..."
            className="min-h-11 w-full min-w-0 bg-transparent text-[15px] outline-none placeholder:text-muted"
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} className="min-h-9 shrink-0 px-2 text-xs font-bold text-muted transition hover:text-ink">
              Clear
            </button>
          ) : null}
        </div>
        <p className="text-xs text-muted">{filteredFields.length} of {fields.length} turf{fields.length === 1 ? "" : "s"} shown</p>
      </form>

      {filteredFields.length ? (
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 md:gap-x-8 md:gap-y-11 xl:grid-cols-4">
          {filteredFields.map((field) => (
            <article key={field.id} className="group min-w-0 transition duration-300 ease-out hover:-translate-y-1">
              <Link href={`/turfs/${field.slug}`} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-olive">
                <div className="relative overflow-hidden border border-transparent bg-[#efe8dd] transition duration-300 group-hover:border-line group-hover:shadow-[0_18px_42px_rgba(23,22,19,0.12)]">
                  {field.image ? (
                    <Image src={field.image} alt={field.alt} width={700} height={700} unoptimized className="aspect-square w-full object-cover transition duration-500 ease-out group-hover:scale-[1.035] group-hover:brightness-[0.96]" />
                  ) : (
                    <div className="grid aspect-square place-items-center"><Icon name="field" className="h-8 w-8 text-muted" /></div>
                  )}
                  <span className="absolute right-3 top-3 grid h-9 w-9 translate-y-1 place-items-center rounded-full bg-white text-ink opacity-0 shadow-[0_8px_24px_rgba(23,22,19,0.14)] transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    <Icon name="arrow-right" className="h-4 w-4" />
                  </span>
                </div>
              </Link>
              <div className="pt-3">
                <p className="truncate text-[9px] font-extrabold uppercase tracking-[0.13em] text-muted">{field.area}</p>
                <Link href={`/turfs/${field.slug}`} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-olive">
                  <h3 className="mt-1 font-serif text-[16px] font-normal leading-tight transition-colors group-hover:text-olive-dark md:text-[18px]">{field.name}</h3>
                </Link>
                <div className="mt-2 flex items-center gap-2 text-[11px] tracking-[0.08em]">
                  <span aria-label={`${field.rating} out of 5 stars`}>★★★★★</span>
                  <span className="tracking-normal text-muted">{field.rating}{field.ratingCount ? ` (${field.ratingCount})` : " · New"}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-[13px] md:text-sm">
                  <strong className="whitespace-nowrap text-[13px] leading-none sm:text-[15px] md:text-[18px]"><BdtAmount value={compactPrice(field.price)} /></strong>
                  <span className="inline-flex min-h-5 items-center whitespace-nowrap rounded-full bg-[#eee8dd] px-2 text-[9px] font-bold text-muted">{field.terms}</span>
                </div>
                <Link href={`/turfs/${field.slug}#booking`} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 border border-olive bg-olive px-3 text-xs font-bold text-white transition hover:bg-olive-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-olive">
                  Book now <Icon name="arrow-right" className="h-3.5 w-3.5" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="border border-line bg-white/70 p-8 text-center">
          <Icon name="search" className="mx-auto h-6 w-6 text-muted" />
          <p className="mt-3 font-bold">No turfs match that search.</p>
          <p className="mt-1 text-sm text-muted">Try a field name, area, surface, or format.</p>
        </div>
      )}
    </div>
  );
}
