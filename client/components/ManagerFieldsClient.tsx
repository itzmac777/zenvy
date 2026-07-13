"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Goal, Pause, Play, Plus } from "lucide-react";
import { useManagerWorkspace } from "@/components/ManagerShell";
import { formatBdt, managerApi, type FieldDetail } from "@/lib/manager-api";

export function ManagerFieldsClient() {
  const { refresh } = useManagerWorkspace();
  const [fields, setFields] = useState<FieldDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await managerApi<{ fields: FieldDetail[] }>("/api/manager/fields");
      setFields(data.fields);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load fields.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function toggleStatus(field: FieldDetail) {
    const status = field.status === "PUBLISHED" ? "PAUSED" : "PUBLISHED";
    await managerApi(`/api/manager/fields/${field.id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
    await Promise.all([load(), refresh()]);
  }

  return (
    <main className="mx-auto max-w-[1200px] px-5 py-7 md:px-8 md:py-10">
      <header className="flex items-end justify-between gap-4">
        <div><p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted">Your workspace</p><h1 className="mt-2 font-serif text-[42px] font-normal leading-none md:text-[56px]">Fields</h1><p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">Playing details, weekly hours, pricing, and publishing status in one place.</p></div>
        <Link href="/manager/fields/new" className="hidden min-h-11 items-center gap-2 border border-olive bg-olive px-5 text-sm font-bold text-white sm:inline-flex"><Plus className="h-4 w-4" /> Add field</Link>
      </header>

      {error ? <p className="mt-5 border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p> : null}
      {loading ? <div className="mt-8 grid min-h-48 place-items-center text-sm text-muted">Loading fields...</div> : null}
      {!loading && !fields.length ? <section className="mt-8 border border-line bg-white/75 p-8 text-center"><Goal className="mx-auto h-7 w-7 text-olive" /><h2 className="mt-4 font-serif text-[32px] font-normal">Create your first field</h2><p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">Set the player-facing details, operating hours, and rates before publishing.</p><Link href="/manager/fields/new" className="mt-6 inline-flex min-h-11 items-center gap-2 border border-olive bg-olive px-5 text-sm font-bold text-white"><Plus className="h-4 w-4" /> Create field</Link></section> : null}

      <section className="mt-8 grid gap-3" aria-label="Managed fields">
        {fields.map((field) => (
          <article key={field.id} className="group grid gap-4 border border-line bg-white/75 p-3 transition duration-200 hover:-translate-y-0.5 hover:border-olive/45 hover:shadow-[0_18px_45px_rgba(23,22,19,0.08)] md:grid-cols-[120px_minmax(0,1fr)_auto] md:items-center md:p-4">
            <div className="relative aspect-[16/10] overflow-hidden bg-panel md:h-[84px] md:w-[120px]">
              {field.image ? <Image src={field.image} alt={field.name} fill unoptimized className="object-cover transition duration-300 group-hover:scale-[1.03]" /> : <span className="grid h-full place-items-center"><Goal className="h-7 w-7 text-muted/50" /></span>}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><span className={`border px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.1em] ${field.status === "PUBLISHED" ? "border-[#a8cec1] bg-[#eff9f5] text-[#245f4d]" : field.status === "PAUSED" ? "border-[#d8c78f] bg-[#fff9e8] text-[#775f13]" : "border-line bg-panel text-muted"}`}>{field.status.toLowerCase()}</span><span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{field.code}</span></div>
              <h2 className="mt-2 truncate font-serif text-[26px] font-normal leading-none">{field.name}</h2>
              <p className="mt-2 text-xs text-muted">{field.format} · {field.capacity} players · {field.openingHours}</p>
            </div>
            <div className="grid grid-cols-[1fr_auto] items-center gap-3 md:grid-cols-[auto_auto_auto]">
              <div className="md:text-right"><strong className="block text-sm">{formatBdt(field.pricing.minimumRateBdt)}/hr</strong><span className="text-[10px] text-muted">from</span></div>
              <button type="button" aria-label={field.status === "PUBLISHED" ? `Pause ${field.name}` : `Publish ${field.name}`} onClick={() => void toggleStatus(field)} className="grid h-11 w-11 place-items-center border border-line bg-white text-muted hover:text-ink">{field.status === "PUBLISHED" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button>
              <Link href={`/manager/fields/${field.id}`} className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 border border-line bg-white px-4 text-xs font-bold md:col-span-1">Manage <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </article>
        ))}
      </section>

      <Link href="/manager/fields/new" className="fixed bottom-[calc(82px+env(safe-area-inset-bottom))] right-4 z-30 grid h-12 w-12 place-items-center rounded-full bg-olive text-white shadow-[0_16px_38px_rgba(23,22,19,0.2)] sm:hidden" aria-label="Add field"><Plus className="h-5 w-5" /></Link>
    </main>
  );
}
