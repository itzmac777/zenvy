"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Camera, Clock3, Goal, Pause, Play, Plus, Settings2 } from "lucide-react";
import { useManagerOnline } from "@/components/ManagerConnectivity";
import { useManagerWorkspace } from "@/components/ManagerShell";
import { managerApi, type FieldDetail } from "@/lib/manager-api";
import { formatManagerTaka, managerErrorText } from "@/lib/manager-ui";

export function SimpleManagerFields() {
  const router = useRouter();
  const online = useManagerOnline();
  const { refresh, setSelectedFieldId } = useManagerWorkspace();
  const [fields, setFields] = useState<FieldDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await managerApi<{ fields: FieldDetail[] }>("/api/manager/fields");
      setFields(data.fields);
    } catch (requestError) { setError(managerErrorText(requestError)); } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function toggle(field: FieldDetail) {
    if (!online) return;
    try {
      await managerApi(`/api/manager/fields/${field.id}/status`, { method: "PATCH", body: JSON.stringify({ status: field.status === "PUBLISHED" ? "PAUSED" : "PUBLISHED" }) });
      await Promise.all([load(), refresh()]);
    } catch (requestError) { setError(managerErrorText(requestError)); }
  }

  function availability(field: FieldDetail) {
    setSelectedFieldId(field.id);
    router.push("/manager");
  }

  return (
    <main className="mx-auto max-w-[980px] px-4 py-5 pb-28 sm:px-6 md:py-8">
      <header className="flex items-center justify-between gap-4"><h1 className="text-3xl font-extrabold">মাঠ</h1><Link href="/manager/fields/new" className="manager-action-press inline-flex min-h-14 items-center gap-2 border border-olive bg-olive px-5 font-extrabold text-white"><Plus className="h-6 w-6" /> যোগ করুন</Link></header>
      {error ? <p role="alert" className="mt-4 border border-red-200 bg-red-50 p-4 font-extrabold text-red-700">{error}</p> : null}
      {loading ? <div className="grid min-h-60 place-items-center font-bold text-muted">Loading...</div> : null}
      {!loading && !fields.length ? <div className="mt-6 grid min-h-72 place-items-center border border-line bg-white text-center"><div><Goal className="mx-auto h-14 w-14 text-olive" /><h2 className="mt-4 text-2xl font-extrabold">মাঠ যোগ করুন</h2><Link href="/manager/fields/new" className="mt-5 inline-flex min-h-14 items-center gap-2 bg-olive px-7 font-extrabold text-white"><Plus className="h-6 w-6" /> শুরু করুন</Link></div></div> : null}
      <section className="mt-5 grid gap-4 sm:grid-cols-2">
        {fields.map((field, index) => (
          <article key={field.id} className="border border-line bg-white p-3">
            <div className="relative aspect-[16/9] overflow-hidden bg-panel">{field.image ? (index === 0 ? <Image src={field.image} alt={field.name} width={1200} height={675} priority unoptimized className="h-full w-full object-cover" /> : <Image src={field.image} alt={field.name} width={1200} height={675} unoptimized className="h-full w-full object-cover" />) : <span className="grid h-full place-items-center"><Camera className="h-12 w-12 text-muted" /></span>}<span className={`absolute left-3 top-3 border px-3 py-2 text-xs font-extrabold ${field.status === "PUBLISHED" ? "border-[#8dc1a3] bg-[#e7f5ec] text-[#185236]" : "border-[#c9c9c5] bg-white text-muted"}`}>{field.status === "PUBLISHED" ? "খোলা" : "বন্ধ"}</span></div>
            <div className="flex items-center justify-between gap-3 py-4"><div className="min-w-0"><h2 className="truncate text-xl font-extrabold">{field.name}</h2><p className="mt-1 truncate text-sm font-bold text-muted">{field.locationLabel}</p></div><strong className="shrink-0 text-xl">{formatManagerTaka(field.pricing.baseRateBdt)}</strong></div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => availability(field)} className="manager-action-press inline-flex min-h-14 items-center justify-center gap-2 border border-olive bg-olive px-2 font-extrabold text-white"><Goal className="h-5 w-5" /> সময়</button>
              <Link href={`/manager/fields/${field.id}?section=hours`} className="manager-action-press inline-flex min-h-14 items-center justify-center gap-2 border border-line bg-white px-2 font-extrabold"><Clock3 className="h-5 w-5" /> খোলা</Link>
              <Link href={`/manager/fields/${field.id}?section=price`} className="manager-action-press inline-flex min-h-14 items-center justify-center gap-2 border border-line bg-white px-2 text-lg font-extrabold"><span className="text-xl">৳</span> দাম</Link>
              <Link href={`/manager/fields/${field.id}?section=identity`} className="manager-action-press inline-flex min-h-14 items-center justify-center gap-2 border border-line bg-white px-2 font-extrabold"><Camera className="h-5 w-5" /> ছবি/নাম</Link>
            </div>
            <button type="button" disabled={!online} onClick={() => void toggle(field)} className="mt-2 inline-flex min-h-[52px] w-full items-center justify-center gap-2 font-extrabold text-muted disabled:opacity-40">{field.status === "PUBLISHED" ? <><Pause className="h-5 w-5" /> বন্ধ রাখুন</> : <><Play className="h-5 w-5" /> খুলুন</>}</button>
            <Link href={`/manager/fields/${field.id}/advanced`} className="mt-1 inline-flex min-h-[52px] w-full items-center justify-center gap-2 text-xs font-bold text-muted"><Settings2 className="h-4 w-4" /> Advanced</Link>
          </article>
        ))}
      </section>
    </main>
  );
}
