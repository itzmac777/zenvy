"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Camera, Check, ChevronLeft, Clock3, Goal, ImagePlus, Pause, Play, Settings2 } from "lucide-react";
import { useManagerOnline } from "@/components/ManagerConnectivity";
import { useManagerWorkspace } from "@/components/ManagerShell";
import { managerApi, type FieldDetail } from "@/lib/manager-api";
import { formatManagerTaka, managerErrorText } from "@/lib/manager-ui";

const days = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহ", "শুক্র", "শনি"];
type Section = "identity" | "hours" | "price";

export function SimpleFieldSettings({ fieldId }: { fieldId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const online = useManagerOnline();
  const { refresh, setSelectedFieldId } = useManagerWorkspace();
  const section = searchParams.get("section") as Section | null;
  const [field, setField] = useState<FieldDetail | null>(null);
  const [name, setName] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [format, setFormat] = useState("5-a-side");
  const [opensAt, setOpensAt] = useState("08:00");
  const [closesAt, setClosesAt] = useState("23:00");
  const [openDays, setOpenDays] = useState<number[]>([]);
  const [baseRateBdt, setBaseRateBdt] = useState(1);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await managerApi<{ field: FieldDetail }>(`/api/manager/fields/${fieldId}`);
      const item = data.field;
      setField(item);
      setName(item.name);
      setLocationLabel(item.locationLabel);
      setFormat(item.format);
      setBaseRateBdt(item.pricing.baseRateBdt);
      const firstOpen = item.weeklyHours.find((day) => !day.isClosed);
      setOpensAt(firstOpen?.opensAt ?? "08:00");
      setClosesAt(firstOpen?.closesAt ?? "23:00");
      setOpenDays(item.weeklyHours.filter((day) => !day.isClosed).map((day) => day.dayOfWeek));
    } catch (requestError) { setError(managerErrorText(requestError)); }
  }, [fieldId]);
  useEffect(() => { void load(); }, [load]);

  const preview = useMemo(() => imageFile ? URL.createObjectURL(imageFile) : field?.image ?? "", [field?.image, imageFile]);
  useEffect(() => () => { if (preview.startsWith("blob:")) URL.revokeObjectURL(preview); }, [preview]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!field || !section || !online) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      if (section === "identity") {
        await managerApi(`/api/manager/fields/${field.id}/basic`, { method: "PATCH", body: JSON.stringify({ name, locationLabel, format }) });
        if (imageFile) {
          const body = new FormData();
          body.append("image", imageFile);
          body.append("alt", name);
          body.append("isCover", "true");
          await managerApi(`/api/manager/fields/${field.id}/images`, { method: "POST", body });
          setImageFile(null);
        }
      }
      if (section === "hours") await managerApi(`/api/manager/fields/${field.id}/basic`, { method: "PATCH", body: JSON.stringify({ opensAt, closesAt, openDays }) });
      if (section === "price") await managerApi(`/api/manager/fields/${field.id}/basic`, { method: "PATCH", body: JSON.stringify({ baseRateBdt: Number(baseRateBdt) }) });
      setNotice("সেভ হয়েছে");
      await Promise.all([load(), refresh()]);
    } catch (requestError) { setError(managerErrorText(requestError)); } finally { setSaving(false); }
  }

  async function toggle() {
    if (!field || !online) return;
    setSaving(true);
    try {
      await managerApi(`/api/manager/fields/${field.id}/status`, { method: "PATCH", body: JSON.stringify({ status: field.status === "PUBLISHED" ? "PAUSED" : "PUBLISHED" }) });
      await Promise.all([load(), refresh()]);
    } catch (requestError) { setError(managerErrorText(requestError)); } finally { setSaving(false); }
  }

  if (!field) return <main className="grid min-h-[70dvh] place-items-center px-4 font-bold text-muted">{error || "Loading..."}</main>;
  if (!section) {
    return <main className="mx-auto max-w-[680px] px-4 py-5 pb-28 sm:px-6"><Link href="/manager/fields" className="inline-flex min-h-[52px] items-center gap-2 font-extrabold text-muted"><ChevronLeft className="h-5 w-5" /> মাঠ</Link><div className="relative mt-2 aspect-[16/9] overflow-hidden border border-line bg-panel">{field.image ? <Image src={field.image} alt={field.name} fill unoptimized className="object-cover" /> : <span className="grid h-full place-items-center"><Camera className="h-14 w-14 text-muted" /></span>}</div><h1 className="mt-5 text-3xl font-extrabold">{field.name}</h1><p className="mt-1 font-bold text-muted">{field.locationLabel}</p><div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={() => { setSelectedFieldId(field.id); router.push("/manager"); }} className="manager-action-press inline-flex min-h-16 items-center justify-center gap-2 border border-olive bg-olive font-extrabold text-white"><Goal className="h-6 w-6" /> সময়</button><Link href={`?section=hours`} className="manager-action-press inline-flex min-h-16 items-center justify-center gap-2 border border-line bg-white font-extrabold"><Clock3 className="h-6 w-6" /> খোলা</Link><Link href={`?section=price`} className="manager-action-press inline-flex min-h-16 items-center justify-center gap-2 border border-line bg-white text-lg font-extrabold"><span className="text-2xl">৳</span> দাম</Link><Link href={`?section=identity`} className="manager-action-press inline-flex min-h-16 items-center justify-center gap-2 border border-line bg-white font-extrabold"><Camera className="h-6 w-6" /> ছবি/নাম</Link></div><button type="button" disabled={!online || saving} onClick={() => void toggle()} className="mt-3 inline-flex min-h-14 w-full items-center justify-center gap-2 border border-line bg-white font-extrabold">{field.status === "PUBLISHED" ? <><Pause className="h-5 w-5" /> বন্ধ রাখুন</> : <><Play className="h-5 w-5" /> খুলুন</>}</button><Link href={`/manager/fields/${field.id}/advanced`} className="mt-3 inline-flex min-h-[52px] w-full items-center justify-center gap-2 text-xs font-bold text-muted"><Settings2 className="h-4 w-4" /> Advanced settings</Link></main>;
  }

  return (
    <main className="mx-auto max-w-[620px] px-4 py-5 pb-32 sm:px-6">
      <Link href={`/manager/fields/${field.id}`} className="inline-flex min-h-[52px] items-center gap-2 font-extrabold text-muted"><ChevronLeft className="h-5 w-5" /> {field.name}</Link>
      <form onSubmit={save} className="mt-3 border border-line bg-white p-4 sm:p-6">
        {section === "identity" ? <><h1 className="text-2xl font-extrabold">ছবি ও নাম</h1><label className="relative mt-5 block aspect-[16/9] cursor-pointer overflow-hidden border-2 border-dashed border-line bg-panel">{preview ? <Image src={preview} alt="Field" fill unoptimized className="object-cover" /> : <span className="grid h-full place-items-center"><ImagePlus className="h-12 w-12 text-muted" /></span>}<input type="file" accept="image/*" capture="environment" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} className="sr-only" /></label><label className="mt-4 block text-sm font-extrabold">নাম<input required value={name} onChange={(event) => setName(event.target.value)} className="mt-2 min-h-14 w-full border-2 border-line px-4 text-xl font-extrabold" /></label><label className="mt-4 block text-sm font-extrabold">এলাকা<input required value={locationLabel} onChange={(event) => setLocationLabel(event.target.value)} className="mt-2 min-h-14 w-full border-2 border-line px-4 text-lg font-extrabold" /></label><div className="mt-4 grid grid-cols-2 gap-2">{["5-a-side", "6-a-side", "7-a-side", "Futsal"].map((value) => <button key={value} type="button" onClick={() => setFormat(value)} className={`min-h-14 border font-extrabold ${format === value ? "border-olive bg-olive text-white" : "border-line bg-white"}`}>{value}</button>)}</div></> : null}
        {section === "hours" ? <><h1 className="text-2xl font-extrabold">খোলার সময়</h1><div className="mt-5 grid grid-cols-2 gap-3"><label className="text-sm font-extrabold">খোলে<input required type="time" step="1800" value={opensAt} onChange={(event) => setOpensAt(event.target.value)} className="mt-2 min-h-16 w-full border-2 border-line px-3 text-lg font-extrabold" /></label><label className="text-sm font-extrabold">বন্ধ হয়<input required type="time" step="1800" value={closesAt} onChange={(event) => setClosesAt(event.target.value)} className="mt-2 min-h-16 w-full border-2 border-line px-3 text-lg font-extrabold" /></label></div><p className="mt-5 text-sm font-extrabold">খোলা দিন</p><div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-7">{days.map((day, index) => { const open = openDays.includes(index); return <button key={day} type="button" onClick={() => setOpenDays(open ? openDays.filter((value) => value !== index) : [...openDays, index].sort())} className={`min-h-[56px] border font-extrabold ${open ? "border-olive bg-olive text-white" : "border-line bg-panel text-muted"}`}>{day}</button>; })}</div></> : null}
        {section === "price" ? <><h1 className="text-2xl font-extrabold">ঘণ্টার দাম</h1><label className="mt-5 block text-sm font-extrabold">প্রতি ঘণ্টা<input required type="number" min="1" value={baseRateBdt} onChange={(event) => setBaseRateBdt(Number(event.target.value))} className="mt-2 min-h-20 w-full border-2 border-line px-4 text-4xl font-extrabold" /></label><div className="mt-4 border border-line bg-panel p-4"><span className="font-bold text-muted">এখন</span><strong className="float-right text-2xl">{formatManagerTaka(field.pricing.baseRateBdt)}</strong></div></> : null}
        {notice ? <p role="status" className="mt-4 flex min-h-14 items-center gap-2 border border-[#a9cdb8] bg-[#edf8f1] px-4 font-extrabold text-[#194f35]"><Check className="h-6 w-6" />{notice}</p> : null}
        {error ? <p role="alert" className="mt-4 border border-red-200 bg-red-50 p-3 font-extrabold text-red-700">{error}</p> : null}
        <button disabled={!online || saving || (section === "hours" && !openDays.length)} className="manager-action-press mt-6 min-h-14 w-full border border-olive bg-olive text-base font-extrabold text-white disabled:opacity-40">{saving ? "..." : "সেভ করুন"}</button>
      </form>
    </main>
  );
}
