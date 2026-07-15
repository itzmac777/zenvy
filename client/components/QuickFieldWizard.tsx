"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Camera, Check, ChevronLeft, ChevronRight, Clock3, Goal, MapPin, Upload } from "lucide-react";
import { useManagerOnline } from "@/components/ManagerConnectivity";
import { useManagerWorkspace } from "@/components/ManagerShell";
import { managerApi, type FieldDetail } from "@/lib/manager-api";
import { formatManagerTaka, managerErrorText } from "@/lib/manager-ui";

const draftKey = "zenvy-quick-field-draft-v1";
const days = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহ", "শুক্র", "শনি"];
const formats = [
  { value: "5-a-side", people: "৫ বনাম ৫" },
  { value: "6-a-side", people: "৬ বনাম ৬" },
  { value: "7-a-side", people: "৭ বনাম ৭" },
  { value: "Futsal", people: "ফুটসাল" },
] as const;

type Draft = {
  fieldId: string;
  step: number;
  name: string;
  locationLabel: string;
  format: "5-a-side" | "6-a-side" | "7-a-side" | "Futsal";
  opensAt: string;
  closesAt: string;
  openDays: number[];
  baseRateBdt: number;
  uploaded: boolean;
};

const initialDraft: Draft = {
  fieldId: "",
  step: 0,
  name: "",
  locationLabel: "",
  format: "5-a-side",
  opensAt: "08:00",
  closesAt: "23:00",
  openDays: [0, 1, 2, 3, 4, 5, 6],
  baseRateBdt: 1,
  uploaded: false,
};

export function QuickFieldWizard() {
  const router = useRouter();
  const online = useManagerOnline();
  const { refresh } = useManagerWorkspace();
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [existingImage, setExistingImage] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem(draftKey);
    if (!saved) {
      setHydrated(true);
      return;
    }
    try {
      const parsed = { ...initialDraft, ...JSON.parse(saved) } as Draft;
      setDraft(parsed);
      if (parsed.fieldId) {
        managerApi<{ field: FieldDetail }>(`/api/manager/fields/${parsed.fieldId}`)
          .then(({ field }) => {
            setExistingImage(field.image ?? "");
            setDraft((current) => ({ ...current, uploaded: Boolean(field.image), name: field.name || current.name }));
          })
          .catch(() => window.localStorage.removeItem(draftKey))
          .finally(() => setHydrated(true));
        return;
      }
    } catch {
      window.localStorage.removeItem(draftKey);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(draftKey, JSON.stringify(draft));
  }, [draft, hydrated]);

  const preview = useMemo(() => imageFile ? URL.createObjectURL(imageFile) : existingImage, [existingImage, imageFile]);
  useEffect(() => () => { if (preview.startsWith("blob:")) URL.revokeObjectURL(preview); }, [preview]);

  async function ensureField() {
    if (draft.fieldId) return draft.fieldId;
    const data = await managerApi<{ field: FieldDetail }>("/api/manager/fields", {
      method: "POST",
      body: JSON.stringify({
        name: draft.name,
        locationLabel: draft.locationLabel || "Location pending",
        format: draft.format,
        opensAt: draft.opensAt,
        closesAt: draft.closesAt,
        openDays: draft.openDays,
        baseRateBdt: draft.baseRateBdt,
      }),
    });
    setDraft((current) => ({ ...current, fieldId: data.field.id }));
    return data.field.id;
  }

  async function uploadPhoto(fieldId: string) {
    if (!imageFile) {
      if (draft.uploaded || existingImage) return;
      throw new Error("PHOTO_REQUIRED");
    }
    const body = new FormData();
    body.append("image", imageFile);
    body.append("alt", draft.name);
    body.append("isCover", "true");
    await managerApi(`/api/manager/fields/${fieldId}/images`, { method: "POST", body });
    setDraft((current) => ({ ...current, uploaded: true }));
    setImageFile(null);
  }

  async function next(event: FormEvent) {
    event.preventDefault();
    if (!online) return;
    setSaving(true);
    setError("");
    try {
      if (draft.step === 0) {
        if (!draft.name.trim() || (!imageFile && !draft.uploaded && !existingImage)) throw new Error("PHOTO_REQUIRED");
        const fieldId = await ensureField();
        await uploadPhoto(fieldId);
      }
      if (draft.step === 1) {
        if (!draft.locationLabel.trim()) throw new Error("LOCATION_REQUIRED");
        await managerApi(`/api/manager/fields/${draft.fieldId}/basic`, { method: "PATCH", body: JSON.stringify({ locationLabel: draft.locationLabel, format: draft.format }) });
      }
      if (draft.step === 2) {
        await managerApi(`/api/manager/fields/${draft.fieldId}/basic`, { method: "PATCH", body: JSON.stringify({ opensAt: draft.opensAt, closesAt: draft.closesAt, openDays: draft.openDays }) });
      }
      setDraft((current) => ({ ...current, step: Math.min(3, current.step + 1) }));
    } catch (requestError) {
      const message = requestError instanceof Error && requestError.message === "PHOTO_REQUIRED" ? "একটি মাঠের ছবি দিন" : requestError instanceof Error && requestError.message === "LOCATION_REQUIRED" ? "এলাকার নাম লিখুন" : managerErrorText(requestError);
      setError(message);
    } finally { setSaving(false); }
  }

  async function publish() {
    if (!draft.fieldId || !online) return;
    setSaving(true);
    setError("");
    try {
      await managerApi(`/api/manager/fields/${draft.fieldId}/basic`, { method: "PATCH", body: JSON.stringify({ baseRateBdt: Number(draft.baseRateBdt) }) });
      await managerApi(`/api/manager/fields/${draft.fieldId}/status`, { method: "PATCH", body: JSON.stringify({ status: "PUBLISHED" }) });
      window.localStorage.removeItem(draftKey);
      await refresh();
      router.push("/manager?practice=1");
    } catch (requestError) {
      setError(managerErrorText(requestError));
    } finally { setSaving(false); }
  }

  if (!hydrated) return <main className="grid min-h-[70dvh] place-items-center font-bold text-muted">Loading...</main>;

  return (
    <main className="mx-auto max-w-[620px] px-4 py-5 pb-28 sm:px-6 md:py-8">
      <header className="flex items-center justify-between gap-4"><div><p className="text-sm font-bold text-muted">মাঠ তৈরি</p><h1 className="mt-1 text-3xl font-extrabold">ধাপ {draft.step + 1} / 4</h1></div><div className="flex gap-1">{[0, 1, 2, 3].map((step) => <span key={step} className={`h-3 w-9 ${step <= draft.step ? "bg-olive" : "bg-line"}`} />)}</div></header>

      <form onSubmit={next} className="mt-6 border border-line bg-[#fffefd] p-4 shadow-soft sm:p-6">
        {draft.step === 0 ? <section><span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#e9edff] text-olive"><Camera className="h-10 w-10" /></span><h2 className="mt-4 text-center text-2xl font-extrabold">ছবি ও নাম</h2><label className="relative mt-5 block aspect-[16/10] cursor-pointer overflow-hidden border-2 border-dashed border-line bg-panel">{preview ? <Image src={preview} alt="Field preview" fill unoptimized className="object-cover" /> : <span className="grid h-full place-items-center text-center font-extrabold text-muted"><span><Upload className="mx-auto h-10 w-10" />ছবি তুলুন / দিন</span></span>}<input required={!draft.uploaded && !existingImage} type="file" accept="image/*" capture="environment" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} className="sr-only" /></label><label className="mt-5 block text-sm font-extrabold">মাঠের নাম<input required autoFocus value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="mt-2 min-h-16 w-full border-2 border-line bg-white px-4 text-xl font-extrabold outline-none focus:border-olive" /></label></section> : null}

        {draft.step === 1 ? <section><span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#e9edff] text-olive"><MapPin className="h-10 w-10" /></span><h2 className="mt-4 text-center text-2xl font-extrabold">এলাকা ও ধরন</h2><label className="mt-5 block text-sm font-extrabold">এলাকা<input required autoFocus value={draft.locationLabel} onChange={(event) => setDraft({ ...draft, locationLabel: event.target.value })} placeholder="যেমন: মিরপুর ১০" className="mt-2 min-h-16 w-full border-2 border-line bg-white px-4 text-xl font-extrabold outline-none focus:border-olive" /></label><div className="mt-5 grid grid-cols-2 gap-2">{formats.map((format) => <button key={format.value} type="button" onClick={() => setDraft({ ...draft, format: format.value })} className={`manager-action-press min-h-20 border p-3 text-center ${draft.format === format.value ? "border-olive bg-olive text-white" : "border-line bg-white"}`}><Goal className="mx-auto h-7 w-7" /><strong className="mt-1 block">{format.people}</strong></button>)}</div></section> : null}

        {draft.step === 2 ? <section><span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#e9edff] text-olive"><Clock3 className="h-10 w-10" /></span><h2 className="mt-4 text-center text-2xl font-extrabold">খোলার সময়</h2><div className="mt-5 grid grid-cols-2 gap-3"><label className="text-sm font-extrabold">খোলে<input required type="time" step="1800" value={draft.opensAt} onChange={(event) => setDraft({ ...draft, opensAt: event.target.value })} className="mt-2 min-h-16 w-full border-2 border-line bg-white px-3 text-lg font-extrabold" /></label><label className="text-sm font-extrabold">বন্ধ হয়<input required type="time" step="1800" value={draft.closesAt} onChange={(event) => setDraft({ ...draft, closesAt: event.target.value })} className="mt-2 min-h-16 w-full border-2 border-line bg-white px-3 text-lg font-extrabold" /></label></div><p className="mt-5 text-sm font-extrabold">খোলা দিন</p><div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-7">{days.map((day, index) => { const open = draft.openDays.includes(index); return <button key={day} type="button" onClick={() => setDraft({ ...draft, openDays: open ? draft.openDays.filter((value) => value !== index) : [...draft.openDays, index].sort() })} className={`manager-action-press min-h-[56px] border font-extrabold ${open ? "border-olive bg-olive text-white" : "border-line bg-panel text-muted"}`}>{day}</button>; })}</div></section> : null}

        {draft.step === 3 ? <section><span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#e9edff] text-3xl font-extrabold text-olive">৳</span><h2 className="mt-4 text-center text-2xl font-extrabold">ঘণ্টার দাম</h2><label className="mt-5 block text-sm font-extrabold">প্রতি ঘণ্টা<input required autoFocus type="number" min="1" value={draft.baseRateBdt} onChange={(event) => setDraft({ ...draft, baseRateBdt: Number(event.target.value) })} className="mt-2 min-h-16 w-full border-2 border-line bg-white px-4 text-3xl font-extrabold outline-none focus:border-olive" /></label><dl className="mt-5 grid gap-px bg-line"><div className="flex justify-between bg-white p-4"><dt className="text-muted">মাঠ</dt><dd className="font-extrabold">{draft.name}</dd></div><div className="flex justify-between bg-white p-4"><dt className="text-muted">এলাকা</dt><dd className="font-extrabold">{draft.locationLabel}</dd></div><div className="flex justify-between bg-white p-4"><dt className="text-muted">সময়</dt><dd className="font-extrabold">{draft.opensAt} – {draft.closesAt}</dd></div><div className="flex justify-between bg-white p-4"><dt className="text-muted">দাম</dt><dd className="text-xl font-extrabold">{formatManagerTaka(draft.baseRateBdt)}</dd></div></dl></section> : null}

        {error ? <p role="alert" className="mt-4 border border-red-200 bg-red-50 p-3 font-extrabold text-red-700">{error}</p> : null}
        {draft.step < 3 ? <button disabled={!online || saving || (draft.step === 2 && draft.openDays.length === 0)} className="manager-action-press mt-6 inline-flex min-h-14 w-full items-center justify-center gap-2 border border-olive bg-olive text-base font-extrabold text-white disabled:opacity-40">{saving ? "..." : "পরের"}<ChevronRight className="h-6 w-6" /></button> : <button type="button" disabled={!online || saving || draft.baseRateBdt < 1} onClick={() => void publish()} className="manager-action-press mt-6 inline-flex min-h-14 w-full items-center justify-center gap-2 border border-olive bg-olive text-base font-extrabold text-white disabled:opacity-40">{saving ? "..." : "প্রকাশ করুন"}<Check className="h-6 w-6" /></button>}
        {draft.step > 0 ? <button type="button" onClick={() => setDraft((current) => ({ ...current, step: current.step - 1 }))} className="mt-2 inline-flex min-h-[52px] w-full items-center justify-center gap-2 font-extrabold text-muted"><ChevronLeft className="h-5 w-5" /> পেছনে</button> : null}
      </form>
    </main>
  );
}
