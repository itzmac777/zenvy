"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Goal, ImagePlus, Plus, Trash2 } from "lucide-react";
import { useManagerWorkspace } from "@/components/ManagerShell";
import { formatBdt, managerApi, type FieldDetail } from "@/lib/manager-api";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const stepNames = ["Basics", "Playing details", "Hours", "Pricing", "Review"];
const inputClass = "min-h-12 w-full border border-line bg-white px-3 text-sm font-normal text-ink outline-none transition focus:border-olive";
const labelClass = "grid gap-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-muted";

function defaultSchedule() {
  return dayNames.map((_, dayOfWeek) => ({ dayOfWeek, isClosed: false, opensAt: "08:00", closesAt: "23:00" }));
}

type FormState = {
  name: string; code: string; address: string; area: string; city: string; contactPhone: string; format: string; description: string; capacity: number; surface: string;
  lengthM: string; widthM: string; heightM: string; amenities: string; featured: boolean; bookingWindowDays: number; minLeadMinutes: number;
  reschedulePolicy: string; baseRateBdt: number; pricingMode: "SAME_ALL_DAY" | "DAY_NIGHT" | "CUSTOM"; dayStart: string; nightStart: string;
  dayRateBdt: number; nightRateBdt: number; coverImageUrl: string; weeklyHours: ReturnType<typeof defaultSchedule>;
  pricingRules: Array<{ dayOfWeek: number; startTime: string; priceBdt: number }>;
};

function initialForm(): FormState {
  return {
    name: "", code: `ZV-${Date.now().toString().slice(-5)}`, address: "", area: "", city: "Dhaka", contactPhone: "", format: "5-a-side", description: "", capacity: 10, surface: "3G artificial turf",
    lengthM: "30", widthM: "18", heightM: "7", amenities: "Changing rooms, Match ball, Bibs included", featured: false, bookingWindowDays: 30, minLeadMinutes: 60,
    reschedulePolicy: "Free reschedule up to 12 hours before kickoff.", baseRateBdt: 1, pricingMode: "SAME_ALL_DAY", dayStart: "06:00", nightStart: "18:00",
    dayRateBdt: 1, nightRateBdt: 1, coverImageUrl: "", weeklyHours: defaultSchedule(), pricingRules: [],
  };
}

export function ManagerFieldWizard({ fieldId }: { fieldId?: string }) {
  const router = useRouter();
  const { session, refresh } = useManagerWorkspace();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(() => ({ ...initialForm(), contactPhone: session.user.phone }));
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(Boolean(fieldId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isEditing = Boolean(fieldId);

  useEffect(() => {
    if (!fieldId) return;
    managerApi<{ field: FieldDetail }>(`/api/manager/fields/${fieldId}`)
      .then(({ field }) => setForm({
        name: field.name, code: field.code, address: field.address, area: field.area, city: field.city, contactPhone: field.contactPhone, format: field.format, description: field.description, capacity: field.capacity, surface: field.surface,
        lengthM: String(field.dimensions.lengthM ?? ""), widthM: String(field.dimensions.widthM ?? ""), heightM: String(field.dimensions.heightM ?? ""), amenities: field.amenities.join(", "), featured: field.featured,
        bookingWindowDays: field.bookingWindowDays, minLeadMinutes: field.minLeadMinutes, reschedulePolicy: field.reschedulePolicy, baseRateBdt: field.pricing.baseRateBdt,
        pricingMode: field.pricing.mode, dayStart: field.pricing.dayStart, nightStart: field.pricing.nightStart, dayRateBdt: field.pricing.dayRateBdt ?? field.pricing.baseRateBdt,
        nightRateBdt: field.pricing.nightRateBdt ?? field.pricing.baseRateBdt, coverImageUrl: field.image ?? "", weeklyHours: field.weeklyHours, pricingRules: field.pricing.rules,
      }))
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Unable to load field."))
      .finally(() => setLoading(false));
  }, [fieldId]);

  function update<Key extends keyof FormState>(key: Key, value: FormState[Key]) { setForm((current) => ({ ...current, [key]: value })); }
  function updateSchedule(index: number, patch: Partial<FormState["weeklyHours"][number]>) { update("weeklyHours", form.weeklyHours.map((day, dayIndex) => dayIndex === index ? { ...day, ...patch } : day)); }
  function updateRule(index: number, patch: Partial<FormState["pricingRules"][number]>) { update("pricingRules", form.pricingRules.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, ...patch } : rule)); }
  function addRule() { update("pricingRules", [...form.pricingRules, { dayOfWeek: 1, startTime: "18:00", priceBdt: form.baseRateBdt }]); }

  const previewImage = useMemo(() => imageFile ? URL.createObjectURL(imageFile) : form.coverImageUrl, [imageFile, form.coverImageUrl]);
  useEffect(() => () => { if (previewImage.startsWith("blob:")) URL.revokeObjectURL(previewImage); }, [previewImage]);

  function requestBody(status: "DRAFT" | "PUBLISHED") {
    return {
      name: form.name, code: form.code, address: form.address, area: form.area, city: form.city, contactPhone: form.contactPhone, format: form.format, description: form.description, capacity: Number(form.capacity), surface: form.surface,
      lengthM: form.lengthM ? Number(form.lengthM) : null, widthM: form.widthM ? Number(form.widthM) : null, heightM: form.heightM ? Number(form.heightM) : null,
      amenities: form.amenities.split(",").map((item) => item.trim()).filter(Boolean), featured: form.featured, bookingWindowDays: Number(form.bookingWindowDays), minLeadMinutes: Number(form.minLeadMinutes),
      reschedulePolicy: form.reschedulePolicy, baseRateBdt: Number(form.baseRateBdt), pricingMode: form.pricingMode, dayStart: form.dayStart, nightStart: form.nightStart,
      dayRateBdt: form.pricingMode === "DAY_NIGHT" ? Number(form.dayRateBdt) : null, nightRateBdt: form.pricingMode === "DAY_NIGHT" ? Number(form.nightRateBdt) : null,
      coverImageUrl: form.coverImageUrl || undefined, weeklyHours: form.weeklyHours, pricingRules: form.pricingMode === "CUSTOM" ? form.pricingRules.map((rule) => ({ ...rule, priceBdt: Number(rule.priceBdt) })) : [], status,
    };
  }

  async function save(status: "DRAFT" | "PUBLISHED") {
    setSaving(true);
    setError("");
    try {
      const data = await managerApi<{ field: FieldDetail }>(fieldId ? `/api/manager/fields/${fieldId}` : "/api/manager/fields", {
        method: fieldId ? "PUT" : "POST", body: JSON.stringify(requestBody(status)),
      });
      if (imageFile) {
        const upload = new FormData();
        upload.append("image", imageFile);
        upload.append("alt", form.name);
        upload.append("isCover", "true");
        await managerApi(`/api/manager/fields/${data.field.id}/images`, { method: "POST", body: upload });
      }
      await refresh();
      router.push(status === "PUBLISHED" ? "/manager" : "/manager/fields");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save field.");
    } finally { setSaving(false); }
  }

  function continueStep(event: FormEvent) {
    event.preventDefault();
    if (step < 4) setStep((value) => value + 1);
  }

  if (loading) return <main className="mx-auto grid min-h-[60vh] max-w-[1100px] place-items-center text-sm text-muted">Loading field...</main>;

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-6 md:px-8 md:py-9">
      <header className="flex items-start justify-between gap-4">
        <div><p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted">{isEditing ? "Field settings" : "Field builder"}</p><h1 className="mt-2 font-serif text-[38px] font-normal leading-none md:text-[50px]">{isEditing ? `Manage ${form.name}` : "Create a field"}</h1></div>
        <span className="text-xs font-bold text-muted">{step + 1} / 5</span>
      </header>
      <div className="scrollbar-none -mx-4 mt-6 flex gap-1 overflow-x-auto border-y border-line bg-white/60 px-4 py-2 md:mx-0 md:border">
        {stepNames.map((name, index) => <button key={name} type="button" onClick={() => setStep(index)} className={`min-h-10 shrink-0 px-4 text-xs font-bold ${step === index ? "bg-olive text-white" : index < step ? "text-ink" : "text-muted"}`}>{index < step ? <Check className="mr-1 inline h-3.5 w-3.5" /> : null}{name}</button>)}
      </div>

      <form onSubmit={continueStep} className="mt-5 pb-24">
        <section className="border border-line bg-[#fffefd]/90 p-5 shadow-soft md:p-8">
          {step === 0 ? <div className="grid gap-5 md:grid-cols-2"><label className={labelClass}>Field name<input required value={form.name} onChange={(event) => update("name", event.target.value)} className={inputClass} /></label><label className={labelClass}>Internal code<input required value={form.code} onChange={(event) => update("code", event.target.value)} className={inputClass} /></label><label className={`${labelClass} md:col-span-2`}>Street address<input required value={form.address} onChange={(event) => update("address", event.target.value)} className={inputClass} /></label><label className={labelClass}>Area<input required value={form.area} onChange={(event) => update("area", event.target.value)} placeholder="Bashundhara, Dhanmondi..." className={inputClass} /></label><label className={labelClass}>City<input required value={form.city} onChange={(event) => update("city", event.target.value)} className={inputClass} /></label><label className={labelClass}>Contact number<input required inputMode="tel" value={form.contactPhone} onChange={(event) => update("contactPhone", event.target.value)} className={inputClass} /></label><label className={labelClass}>Format<select value={form.format} onChange={(event) => update("format", event.target.value)} className={inputClass}>{["5-a-side", "6-a-side", "7-a-side", "Futsal"].map((format) => <option key={format}>{format}</option>)}</select></label><label className={`${labelClass} md:col-span-2`}>Description<textarea required minLength={10} value={form.description} onChange={(event) => update("description", event.target.value)} className={`${inputClass} min-h-32 py-3 leading-relaxed`} /></label></div> : null}

          {step === 1 ? <div className="grid gap-5 md:grid-cols-3"><label className={labelClass}>Capacity<input required type="number" min="2" value={form.capacity} onChange={(event) => update("capacity", Number(event.target.value))} className={inputClass} /></label><label className={`${labelClass} md:col-span-2`}>Surface<input required value={form.surface} onChange={(event) => update("surface", event.target.value)} className={inputClass} /></label><label className={labelClass}>Length (m)<input type="number" min="1" step="0.5" value={form.lengthM} onChange={(event) => update("lengthM", event.target.value)} className={inputClass} /></label><label className={labelClass}>Width (m)<input type="number" min="1" step="0.5" value={form.widthM} onChange={(event) => update("widthM", event.target.value)} className={inputClass} /></label><label className={labelClass}>Ceiling height (m)<input type="number" min="1" step="0.5" value={form.heightM} onChange={(event) => update("heightM", event.target.value)} className={inputClass} /></label><label className={`${labelClass} md:col-span-3`}>Amenities, comma separated<input value={form.amenities} onChange={(event) => update("amenities", event.target.value)} className={inputClass} /></label><div className="md:col-span-3"><p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-muted">Cover image</p><div className="mt-2 grid gap-4 md:grid-cols-[180px_1fr]">{previewImage ? <div className="relative aspect-[16/10] overflow-hidden bg-panel"><Image src={previewImage} alt="Field preview" fill unoptimized className="object-cover" /></div> : <div className="grid aspect-[16/10] place-items-center border border-dashed border-line bg-panel"><ImagePlus className="h-7 w-7 text-muted" /></div>}<div className="grid gap-3"><input type="file" accept="image/*" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} className="min-h-12 border border-line bg-white px-3 py-2 text-sm" /><input type="url" value={form.coverImageUrl} onChange={(event) => update("coverImageUrl", event.target.value)} placeholder="Or paste an image URL" className={inputClass} /></div></div></div></div> : null}

          {step === 2 ? <div><div className="grid gap-2">{form.weeklyHours.map((day, index) => <div key={day.dayOfWeek} className="grid grid-cols-[94px_1fr] items-center gap-3 border-b border-line py-3 sm:grid-cols-[120px_100px_1fr_1fr]"><strong className="text-sm">{dayNames[day.dayOfWeek]}</strong><label className="inline-flex min-h-11 items-center gap-2 text-xs font-bold"><input type="checkbox" checked={!day.isClosed} onChange={(event) => updateSchedule(index, { isClosed: !event.target.checked })} className="h-4 w-4 accent-[#5363f1]" /> Open</label><label className={`${labelClass} ${day.isClosed ? "opacity-40" : ""}`}>From<input disabled={day.isClosed} type="time" step="1800" value={day.opensAt} onChange={(event) => updateSchedule(index, { opensAt: event.target.value })} className={inputClass} /></label><label className={`${labelClass} ${day.isClosed ? "opacity-40" : ""}`}>Until<input disabled={day.isClosed} type="time" step="1800" value={day.closesAt} onChange={(event) => updateSchedule(index, { closesAt: event.target.value })} className={inputClass} /></label></div>)}</div><div className="mt-7 grid gap-5 md:grid-cols-2"><label className={labelClass}>Booking window (days)<input type="number" min="1" max="90" value={form.bookingWindowDays} onChange={(event) => update("bookingWindowDays", Number(event.target.value))} className={inputClass} /></label><label className={labelClass}>Minimum notice (minutes)<input type="number" min="0" step="30" value={form.minLeadMinutes} onChange={(event) => update("minLeadMinutes", Number(event.target.value))} className={inputClass} /></label><label className={`${labelClass} md:col-span-2`}>Reschedule policy<textarea value={form.reschedulePolicy} onChange={(event) => update("reschedulePolicy", event.target.value)} className={`${inputClass} min-h-24 py-3`} /></label></div></div> : null}

          {step === 3 ? <div><div className="grid grid-cols-3 border border-line bg-panel p-1">{[{ value: "SAME_ALL_DAY", label: "Same all day" }, { value: "DAY_NIGHT", label: "Day / night" }, { value: "CUSTOM", label: "Custom slots" }].map((mode) => <button key={mode.value} type="button" onClick={() => update("pricingMode", mode.value as FormState["pricingMode"])} className={`min-h-12 px-2 text-[11px] font-bold ${form.pricingMode === mode.value ? "bg-white text-ink shadow-sm" : "text-muted"}`}>{mode.label}</button>)}</div><div className="mt-6 grid gap-5 md:grid-cols-2"><label className={labelClass}>Base hourly rate (BDT)<input required type="number" min="1" value={form.baseRateBdt} onChange={(event) => update("baseRateBdt", Number(event.target.value))} className={inputClass} /></label>{form.pricingMode === "DAY_NIGHT" ? <><label className={labelClass}>Day starts<input type="time" step="1800" value={form.dayStart} onChange={(event) => update("dayStart", event.target.value)} className={inputClass} /></label><label className={labelClass}>Day rate (BDT)<input type="number" min="1" value={form.dayRateBdt} onChange={(event) => update("dayRateBdt", Number(event.target.value))} className={inputClass} /></label><label className={labelClass}>Night starts<input type="time" step="1800" value={form.nightStart} onChange={(event) => update("nightStart", event.target.value)} className={inputClass} /></label><label className={labelClass}>Night rate (BDT)<input type="number" min="1" value={form.nightRateBdt} onChange={(event) => update("nightRateBdt", Number(event.target.value))} className={inputClass} /></label></> : null}</div>{form.pricingMode === "CUSTOM" ? <div className="mt-7"><div className="flex items-center justify-between"><div><h3 className="font-serif text-[26px] font-normal">Recurring slot prices</h3><p className="mt-1 text-xs text-muted">Unlisted hours use the base rate.</p></div><button type="button" onClick={addRule} className="inline-flex min-h-11 items-center gap-2 border border-line bg-white px-4 text-xs font-bold"><Plus className="h-4 w-4" /> Add</button></div><div className="mt-4 grid gap-2">{form.pricingRules.map((rule, index) => <div key={`${rule.dayOfWeek}-${rule.startTime}-${index}`} className="grid grid-cols-[1fr_100px_100px_44px] gap-2"><select value={rule.dayOfWeek} onChange={(event) => updateRule(index, { dayOfWeek: Number(event.target.value) })} className={inputClass}>{dayNames.map((name, dayIndex) => <option key={name} value={dayIndex}>{name}</option>)}</select><input type="time" step="1800" value={rule.startTime} onChange={(event) => updateRule(index, { startTime: event.target.value })} className={inputClass} /><input type="number" min="1" value={rule.priceBdt} onChange={(event) => updateRule(index, { priceBdt: Number(event.target.value) })} className={inputClass} /><button type="button" aria-label="Remove rule" onClick={() => update("pricingRules", form.pricingRules.filter((_, ruleIndex) => ruleIndex !== index))} className="grid h-12 w-11 place-items-center border border-line bg-white text-muted"><Trash2 className="h-4 w-4" /></button></div>)}</div></div> : null}</div> : null}

          {step === 4 ? <div className="grid gap-7 md:grid-cols-[1fr_280px]"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted">Player-facing preview</p><h2 className="mt-3 font-serif text-[38px] font-normal leading-none">{form.name || "Untitled field"}</h2><p className="mt-3 text-sm font-bold text-muted">{form.format} · {form.capacity} players · {form.surface}</p><p className="mt-5 text-[15px] leading-relaxed text-muted">{form.description || "Add a description before publishing."}</p><div className="mt-6 flex flex-wrap gap-2">{form.amenities.split(",").map((item) => item.trim()).filter(Boolean).map((item) => <span key={item} className="border border-line bg-white px-3 py-2 text-xs font-bold">{item}</span>)}</div></div><aside className="border border-line bg-panel/60 p-5"><p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted">Booking setup</p><dl className="mt-4 grid gap-4 text-sm"><div><dt className="text-muted">Rate</dt><dd className="mt-1 font-bold">{formatBdt(form.baseRateBdt)}/hr</dd></div><div><dt className="text-muted">Pricing mode</dt><dd className="mt-1 font-bold">{form.pricingMode.replaceAll("_", " ").toLowerCase()}</dd></div><div><dt className="text-muted">Open days</dt><dd className="mt-1 font-bold">{form.weeklyHours.filter((day) => !day.isClosed).length} per week</dd></div><div><dt className="text-muted">Booking window</dt><dd className="mt-1 font-bold">{form.bookingWindowDays} days</dd></div></dl></aside></div> : null}
        </section>

        {error ? <p role="alert" className="mt-4 border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
        <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-40 border-t border-line bg-paper/96 px-4 py-3 backdrop-blur-xl md:bottom-0 md:left-auto md:right-0 md:w-full">
          <div className="mx-auto grid max-w-[1100px] grid-cols-[auto_1fr] gap-3 md:grid-cols-[auto_1fr_auto_auto]">
            <button type="button" onClick={() => step > 0 ? setStep((value) => value - 1) : router.back()} className="inline-flex min-h-11 items-center justify-center gap-2 border border-line bg-white px-4 text-sm font-bold"><ArrowLeft className="h-4 w-4" /> Back</button>
            <span className="hidden self-center text-xs text-muted md:block">{stepNames[step]}</span>
            {step === 4 ? <button type="button" disabled={saving} onClick={() => void save("DRAFT")} className="hidden min-h-11 border border-line bg-white px-5 text-sm font-bold sm:block">Save draft</button> : null}
            {step < 4 ? <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 border border-olive bg-olive px-5 text-sm font-bold text-white">Continue <ArrowRight className="h-4 w-4" /></button> : <button type="button" disabled={saving} onClick={() => void save("PUBLISHED")} className="inline-flex min-h-11 items-center justify-center gap-2 border border-olive bg-olive px-5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Publishing..." : "Publish field"}<Goal className="h-4 w-4" /></button>}
          </div>
        </div>
      </form>
    </main>
  );
}
