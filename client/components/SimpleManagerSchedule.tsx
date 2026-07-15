"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  Banknote,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  LockKeyhole,
  Phone,
  Plus,
  RefreshCw,
  RotateCcw,
  UserRound,
  X,
} from "lucide-react";
import { useManagerOnline } from "@/components/ManagerConnectivity";
import { useManagerWorkspace } from "@/components/ManagerShell";
import { ManagerPracticeGuide } from "@/components/ManagerPracticeGuide";
import {
  dateKey,
  managerApi,
  type AvailabilityResponse,
  type AvailabilitySlot,
  type ManagerBooking,
} from "@/lib/manager-api";
import { formatManagerTaka, managerCopy, managerErrorText } from "@/lib/manager-ui";

type EmptyAction = "book" | "block" | "price";
type EmptyStep = "duration" | "phone" | "confirm" | "success";
type Sheet =
  | { kind: "empty"; slot: AvailabilitySlot; action: EmptyAction; step: EmptyStep }
  | { kind: "detail"; slot: AvailabilitySlot }
  | null;

function addDays(value: string, amount: number) {
  const date = new Date(`${value}T12:00:00+06:00`);
  date.setUTCDate(date.getUTCDate() + amount);
  return dateKey(date);
}

function dayMeta(value: string) {
  const date = new Date(`${value}T12:00:00+06:00`);
  return {
    weekday: new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dhaka", weekday: "short" }).format(date),
    day: new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dhaka", day: "numeric" }).format(date),
    month: new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dhaka", month: "short" }).format(date),
    long: new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dhaka", weekday: "long", month: "long", day: "numeric" }).format(date),
  };
}

function slotAppearance(slot: AvailabilitySlot) {
  const booking = slot.occupancy?.booking;
  if (slot.status === "AVAILABLE") {
    return { label: managerCopy.empty, hint: "বুকিং করুন", icon: Plus, className: "border-[#a9cdb8] bg-white text-[#194f35]" };
  }
  if (slot.status === "HELD") {
    return { label: managerCopy.waiting, hint: "পেমেন্ট চলছে", icon: Clock3, className: "border-[#dfc66a] bg-[#fff7d8] text-[#684f00]" };
  }
  if ((slot.status === "BOOKED" || slot.status === "MANUAL_BOOKED") && booking?.balanceAmountBdt) {
    return { label: managerCopy.due, hint: formatManagerTaka(booking.balanceAmountBdt), icon: Banknote, className: "border-[#dda26e] bg-[#fff0e2] text-[#713d16]" };
  }
  if (slot.status === "BOOKED" || slot.status === "MANUAL_BOOKED") {
    return { label: managerCopy.booked, hint: booking?.customerPhone ?? "", icon: CheckCircle2, className: "border-[#9aaaf5] bg-[#e9edff] text-[#263786]" };
  }
  return { label: managerCopy.closed, hint: slot.occupancy?.block?.reason ?? "", icon: LockKeyhole, className: "border-[#c9c9c5] bg-[#ecece8] text-[#52524e]" };
}

function BottomSheet({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[80] bg-ink/35">
      <button type="button" aria-label="Close" className="absolute inset-0 h-full w-full cursor-default" onClick={close} />
      <section className="absolute inset-x-0 bottom-0 max-h-[94dvh] overflow-y-auto border-t border-line bg-[#fffefd] px-4 pb-[calc(22px+env(safe-area-inset-bottom))] pt-4 shadow-[0_-20px_60px_rgba(23,22,19,.2)] md:left-auto md:right-5 md:top-5 md:w-[460px] md:border md:p-6">
        <header className="flex items-center justify-between gap-4 border-b border-line pb-4">
          <h2 className="text-xl font-extrabold">{title}</h2>
          <button type="button" onClick={close} aria-label="Close" className="grid h-12 w-12 place-items-center border border-line bg-white"><X className="h-6 w-6" /></button>
        </header>
        {children}
      </section>
    </div>
  );
}

export function SimpleManagerSchedule() {
  const searchParams = useSearchParams();
  const { fields, selectedField, setSelectedFieldId } = useManagerWorkspace();
  const online = useManagerOnline();
  const [anchorDate, setAnchorDate] = useState(() => dateKey(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [duration, setDuration] = useState(1);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [showName, setShowName] = useState(false);
  const [specialPrice, setSpecialPrice] = useState("");
  const [createdBooking, setCreatedBooking] = useState<ManagerBooking | null>(null);
  const [detailBooking, setDetailBooking] = useState<ManagerBooking | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [showPartial, setShowPartial] = useState(false);
  const [partialAmount, setPartialAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [practiceOpen, setPracticeOpen] = useState(false);
  const rangeEnd = addDays(anchorDate, 6);

  const load = useCallback(async () => {
    if (!selectedField) {
      setAvailability(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await managerApi<AvailabilityResponse>(`/api/manager/availability?fieldId=${encodeURIComponent(selectedField.id)}&from=${anchorDate}&to=${rangeEnd}`);
      setAvailability(data);
      setSelectedDate((current) => data.days.some((day) => day.date === current) ? current : data.days[0]?.date ?? anchorDate);
    } catch (requestError) {
      setError(managerErrorText(requestError));
    } finally {
      setLoading(false);
    }
  }, [anchorDate, rangeEnd, selectedField]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const forced = searchParams.get("practice") === "1";
    const seen = typeof window !== "undefined" && window.localStorage.getItem("zenvy-manager-practice-v1") === "seen";
    if (forced || (!seen && fields.length > 0)) setPracticeOpen(true);
  }, [fields.length, searchParams]);

  const selectedDay = availability?.days.find((day) => day.date === selectedDate) ?? availability?.days[0];
  const dayStats = useMemo(() => {
    const slots = selectedDay?.slots ?? [];
    return {
      open: slots.filter((slot) => slot.status === "AVAILABLE").length,
      booked: slots.filter((slot) => slot.status === "BOOKED" || slot.status === "MANUAL_BOOKED").length,
      due: slots.filter((slot) => (slot.occupancy?.booking?.balanceAmountBdt ?? 0) > 0).length,
      closed: slots.filter((slot) => slot.status === "CLOSED" || slot.status === "BLOCKED").length,
    };
  }, [selectedDay]);
  const emptySlot = sheet?.kind === "empty" ? sheet.slot : null;
  const emptyIndex = emptySlot ? selectedDay?.slots.findIndex((slot) => slot.startAt === emptySlot.startAt) ?? -1 : -1;
  const durationOptions = useMemo(() => [1, 2, 3, 4].map((hours) => ({
    hours,
    enabled: emptyIndex >= 0 && (selectedDay?.slots.slice(emptyIndex, emptyIndex + hours).length === hours) && selectedDay?.slots.slice(emptyIndex, emptyIndex + hours).every((slot) => slot.status === "AVAILABLE"),
  })), [emptyIndex, selectedDay]);
  const selectedSlots = emptyIndex >= 0 ? selectedDay?.slots.slice(emptyIndex, emptyIndex + duration) ?? [] : [];
  const total = selectedSlots.reduce((sum, slot) => sum + slot.priceBdt, 0);

  function openEmpty(slot: AvailabilitySlot) {
    setDuration(1);
    setPhone("");
    setName("");
    setShowName(false);
    setSpecialPrice(String(slot.priceBdt));
    setCreatedBooking(null);
    setError("");
    setSheet({ kind: "empty", slot, action: "book", step: "duration" });
  }

  async function openDetail(slot: AvailabilitySlot) {
    setDetailBooking(null);
    setShowMore(false);
    setShowPartial(false);
    setConfirmCancel(false);
    setError("");
    setSheet({ kind: "detail", slot });
    const bookingId = slot.occupancy?.booking?.id;
    if (!bookingId) return;
    try {
      const data = await managerApi<{ booking: ManagerBooking }>(`/api/manager/bookings/${bookingId}`);
      setDetailBooking(data.booking);
    } catch (requestError) {
      setError(managerErrorText(requestError));
    }
  }

  function closeSheet() {
    setSheet(null);
    setError("");
    setShowMore(false);
    setConfirmCancel(false);
  }

  async function createBooking(event: FormEvent) {
    event.preventDefault();
    if (!selectedField || !online) return;
    setSaving(true);
    setError("");
    try {
      const data = await managerApi<{ booking: ManagerBooking }>("/api/manager/manual-bookings", {
        method: "POST",
        body: JSON.stringify({
          fieldId: selectedField.id,
          slotStartAts: selectedSlots.map((slot) => slot.startAt),
          customerPhone: phone,
          customerName: name || undefined,
        }),
      });
      setCreatedBooking(data.booking);
      setSheet((current) => current?.kind === "empty" ? { ...current, step: "success" } : current);
      await load();
    } catch (requestError) {
      setError(managerErrorText(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function createBlock() {
    if (!selectedField || !online) return;
    setSaving(true);
    setError("");
    try {
      await managerApi("/api/manager/blocks", {
        method: "POST",
        body: JSON.stringify({ fieldId: selectedField.id, slotStartAts: selectedSlots.map((slot) => slot.startAt), reason: "Maintenance" }),
      });
      setNotice("সময় বন্ধ করা হয়েছে");
      closeSheet();
      await load();
    } catch (requestError) {
      setError(managerErrorText(requestError));
    } finally { setSaving(false); }
  }

  async function savePrice() {
    if (!selectedField || !online) return;
    setSaving(true);
    setError("");
    try {
      await managerApi("/api/manager/slot-overrides", {
        method: "POST",
        body: JSON.stringify({ fieldId: selectedField.id, slotStartAts: selectedSlots.map((slot) => slot.startAt), priceBdt: Number(specialPrice), availability: "DEFAULT" }),
      });
      setNotice("দাম বদলানো হয়েছে");
      closeSheet();
      await load();
    } catch (requestError) {
      setError(managerErrorText(requestError));
    } finally { setSaving(false); }
  }

  async function collectPayment(amount: number) {
    const bookingId = detailBooking?.id ?? (sheet?.kind === "detail" ? sheet.slot.occupancy?.booking?.id : null);
    if (!bookingId || amount < 1 || !online) return;
    setSaving(true);
    setError("");
    try {
      const data = await managerApi<{ booking: ManagerBooking }>(`/api/manager/bookings/${bookingId}/payments`, {
        method: "POST",
        body: JSON.stringify({ amountBdt: amount, method: paymentMethod }),
      });
      setDetailBooking(data.booking);
      setNotice("টাকা জমা হয়েছে");
      setShowPartial(false);
      await load();
    } catch (requestError) {
      setError(managerErrorText(requestError));
    } finally { setSaving(false); }
  }

  async function removeBlock() {
    const blockId = sheet?.kind === "detail" ? sheet.slot.occupancy?.block?.id : null;
    if (!blockId || !online) return;
    setSaving(true);
    try {
      await managerApi(`/api/manager/blocks/${blockId}`, { method: "DELETE" });
      setNotice("সময় আবার খোলা হয়েছে");
      closeSheet();
      await load();
    } catch (requestError) { setError(managerErrorText(requestError)); } finally { setSaving(false); }
  }

  async function openClosedSlot() {
    if (!selectedField || sheet?.kind !== "detail" || !online) return;
    setSaving(true);
    try {
      await managerApi("/api/manager/slot-overrides", { method: "POST", body: JSON.stringify({ fieldId: selectedField.id, slotStartAts: [sheet.slot.startAt], availability: "OPEN" }) });
      setNotice("সময় খোলা হয়েছে");
      closeSheet();
      await load();
    } catch (requestError) { setError(managerErrorText(requestError)); } finally { setSaving(false); }
  }

  async function cancelBooking() {
    const bookingId = detailBooking?.id ?? (sheet?.kind === "detail" ? sheet.slot.occupancy?.booking?.id : null);
    if (!bookingId || !online) return;
    setSaving(true);
    try {
      await managerApi(`/api/manager/bookings/${bookingId}/cancel`, { method: "POST" });
      setNotice("বুকিং বাতিল হয়েছে");
      closeSheet();
      await load();
    } catch (requestError) { setError(managerErrorText(requestError)); } finally { setSaving(false); }
  }

  if (!fields.length) {
    return (
      <main className="mx-auto grid min-h-[calc(100dvh-150px)] max-w-lg place-items-center px-5 py-10 text-center">
        <div><span className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-[#e9edff] text-olive"><Plus className="h-12 w-12" /></span><h1 className="mt-6 text-3xl font-extrabold">মাঠ যোগ করুন</h1><Link href="/manager/fields/new" className="manager-action-press mt-7 inline-flex min-h-14 items-center justify-center gap-2 border border-olive bg-olive px-8 text-base font-extrabold text-white"><Plus className="h-6 w-6" /> মাঠ যোগ করুন</Link></div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[920px] px-3 py-4 sm:px-5 md:py-7">
      <header className="flex items-center justify-between gap-3">
        <div><p className="text-xs font-bold text-muted">{dayMeta(selectedDate).long}</p><h1 className="mt-1 text-3xl font-extrabold">{managerCopy.today}</h1></div>
        <button type="button" onClick={() => void load()} aria-label="Refresh" className="grid h-14 w-14 place-items-center border border-line bg-white"><RefreshCw className={`h-6 w-6 ${loading ? "animate-spin" : ""}`} /></button>
      </header>

      <section className="mt-4 border border-line bg-[#fffefd] p-4 shadow-soft">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0"><p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted">আজকের মাঠ</p><h2 className="mt-1 truncate text-2xl font-extrabold">{selectedField?.name}</h2></div>
          <Link href="/manager/fields" className="shrink-0 border border-line bg-panel px-3 py-2 text-xs font-extrabold text-muted">মাঠ বদলান</Link>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2">
          <div className="border border-[#a9cdb8] bg-[#edf8f1] p-3 text-center"><strong className="block text-2xl">{dayStats.open}</strong><span className="text-[11px] font-extrabold text-[#194f35]">খালি</span></div>
          <div className="border border-[#9aaaf5] bg-[#e9edff] p-3 text-center"><strong className="block text-2xl">{dayStats.booked}</strong><span className="text-[11px] font-extrabold text-[#263786]">বুকিং</span></div>
          <div className="border border-[#dda26e] bg-[#fff0e2] p-3 text-center"><strong className="block text-2xl">{dayStats.due}</strong><span className="text-[11px] font-extrabold text-[#713d16]">বাকি</span></div>
          <div className="border border-line bg-[#ecece8] p-3 text-center"><strong className="block text-2xl">{dayStats.closed}</strong><span className="text-[11px] font-extrabold text-muted">বন্ধ</span></div>
        </div>
      </section>

      <div className="-mx-3 mt-4 flex gap-2 overflow-x-auto px-3 pb-1 sm:-mx-5 sm:px-5 md:hidden">
        {fields.map((field) => <button key={field.id} type="button" onClick={() => setSelectedFieldId(field.id)} className={`min-h-[52px] shrink-0 border px-5 text-sm font-extrabold ${selectedField?.id === field.id ? "border-olive bg-olive text-white" : "border-line bg-white"}`}>{field.name}</button>)}
      </div>

      <section className="sticky top-[69px] z-30 -mx-3 mt-4 border-y border-line bg-[#f8f7f3]/96 px-3 py-3 backdrop-blur sm:-mx-5 sm:px-5 md:static md:mx-0 md:border md:bg-white">
        <div className="flex gap-2 overflow-x-auto">
          {Array.from({ length: 7 }, (_, index) => addDays(anchorDate, index)).map((value) => {
            const meta = dayMeta(value);
            const active = selectedDate === value;
            return <button key={value} type="button" onClick={() => setSelectedDate(value)} className={`grid min-h-[68px] min-w-[66px] shrink-0 place-items-center border px-2 ${active ? "border-olive bg-olive text-white" : "border-line bg-white"}`}><span className="text-[10px] font-extrabold uppercase">{value === dateKey(new Date()) ? "TODAY" : meta.weekday}</span><strong className="text-xl leading-none">{meta.day}</strong><span className="text-[10px]">{meta.month}</span></button>;
          })}
        </div>
      </section>

      {notice ? <div role="status" className="mt-3 flex min-h-14 items-center gap-3 border border-[#a9cdb8] bg-[#edf8f1] px-4 font-extrabold text-[#194f35]"><Check className="h-6 w-6" />{notice}</div> : null}
      {error && !sheet ? <div role="alert" className="mt-3 border border-red-200 bg-red-50 p-4 font-bold text-red-700">{error}</div> : null}

      <section className="mt-4 grid gap-2" aria-label="Daily slots">
        {loading && !selectedDay ? <div className="grid min-h-56 place-items-center text-sm font-bold text-muted">Loading...</div> : null}
        {!loading && !selectedDay?.slots.length ? <div className="grid min-h-56 place-items-center border border-line bg-[#ecece8] text-center"><div><LockKeyhole className="mx-auto h-10 w-10 text-muted" /><strong className="mt-3 block text-xl">বন্ধ</strong></div></div> : null}
        {selectedDay?.slots.map((slot) => {
          const appearance = slotAppearance(slot);
          const Icon = appearance.icon;
          return (
            <button key={slot.startAt} type="button" onClick={() => slot.status === "AVAILABLE" ? openEmpty(slot) : void openDetail(slot)} className={`manager-action-press grid min-h-[76px] w-full grid-cols-[92px_52px_minmax(0,1fr)_auto] items-center gap-3 border px-3 text-left sm:min-h-[82px] sm:grid-cols-[120px_58px_minmax(0,1fr)_auto] sm:px-5 ${appearance.className}`}>
              <strong className="text-[22px] leading-none sm:text-[26px]">{slot.label}</strong>
              <span className="grid h-12 w-12 place-items-center rounded-full border border-current/25 bg-white/70"><Icon className="h-7 w-7" /></span>
              <span className="min-w-0"><strong className="block truncate text-base sm:text-lg">{appearance.label}</strong><small className="mt-1 block truncate font-bold opacity-70">{appearance.hint}</small></span>
              <strong className="text-base sm:text-lg">{slot.status === "AVAILABLE" ? formatManagerTaka(slot.priceBdt) : ""}</strong>
            </button>
          );
        })}
      </section>

      <div className="mt-4 flex justify-between gap-2">
        <button type="button" onClick={() => { const next = addDays(anchorDate, -7); setAnchorDate(next); setSelectedDate(next); }} className="inline-flex min-h-[52px] items-center gap-2 border border-line bg-white px-4 font-extrabold"><ChevronLeft className="h-5 w-5" /> আগের</button>
        <button type="button" onClick={() => { const next = addDays(anchorDate, 7); setAnchorDate(next); setSelectedDate(next); }} className="inline-flex min-h-[52px] items-center gap-2 border border-line bg-white px-4 font-extrabold">পরের <CalendarDays className="h-5 w-5" /></button>
      </div>

      {sheet?.kind === "empty" ? (
        <BottomSheet title={sheet.action === "book" ? "বুকিং" : sheet.action === "block" ? "বন্ধ রাখুন" : "দাম বদলান"} close={closeSheet}>
          {sheet.step === "duration" ? <div className="pt-5"><p className="text-sm font-bold text-muted">{sheet.slot.label} থেকে কত ঘণ্টা?</p><div className="mt-4 grid grid-cols-4 gap-2">{durationOptions.map((option) => <button key={option.hours} type="button" disabled={!option.enabled} onClick={() => setDuration(option.hours)} className={`manager-action-press min-h-16 border text-2xl font-extrabold disabled:cursor-not-allowed disabled:opacity-25 ${duration === option.hours ? "border-olive bg-olive text-white" : "border-line bg-white"}`}>{option.hours}</button>)}</div><div className="mt-5 border border-line bg-panel p-4"><strong className="text-xl">{duration} ঘণ্টা</strong><span className="float-right text-xl font-extrabold">{formatManagerTaka(total)}</span><span className="mt-1 block text-sm text-muted">{sheet.slot.label} থেকে</span></div><button type="button" onClick={() => setSheet({ ...sheet, action: "book", step: "phone" })} className="manager-action-press mt-4 flex min-h-14 w-full items-center justify-center gap-2 border border-olive bg-olive px-5 text-base font-extrabold text-white"><UserRound className="h-6 w-6" /> বুকিং</button><div className="mt-2 grid grid-cols-2 gap-2"><button type="button" onClick={() => setSheet({ ...sheet, action: "block", step: "confirm" })} className="manager-action-press min-h-14 border border-line bg-white font-extrabold"><Ban className="mr-2 inline h-5 w-5" /> বন্ধ</button><button type="button" onClick={() => setSheet({ ...sheet, action: "price", step: "confirm" })} className="manager-action-press min-h-14 border border-line bg-white font-extrabold"><Banknote className="mr-2 inline h-5 w-5" /> দাম</button></div></div> : null}

          {sheet.step === "phone" ? <form onSubmit={(event) => { event.preventDefault(); setSheet({ ...sheet, step: "confirm" }); }} className="pt-5"><label className="block text-sm font-extrabold">ফোন নম্বর<input autoFocus required inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="01XXXXXXXXX" className="mt-2 min-h-16 w-full border-2 border-line bg-white px-4 text-2xl font-extrabold outline-none focus:border-olive" /></label>{showName ? <label className="mt-4 block text-sm font-extrabold">নাম <span className="text-muted">(ইচ্ছা হলে)</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} className="mt-2 min-h-14 w-full border border-line bg-white px-4 text-lg font-bold outline-none focus:border-olive" /></label> : <button type="button" onClick={() => setShowName(true)} className="mt-3 inline-flex min-h-[52px] items-center gap-2 px-2 font-extrabold text-olive"><Plus className="h-5 w-5" /> নাম যোগ করুন</button>}<button className="manager-action-press mt-5 min-h-14 w-full border border-olive bg-olive text-base font-extrabold text-white">{managerCopy.next}</button></form> : null}

          {sheet.step === "confirm" && sheet.action === "book" ? <form onSubmit={createBooking} className="pt-5"><BookingSummary fieldName={selectedField?.name ?? ""} date={selectedDate} start={sheet.slot.label} duration={duration} phone={phone} total={total} /><button disabled={!online || saving} className="manager-action-press mt-5 min-h-14 w-full border border-olive bg-olive text-base font-extrabold text-white disabled:opacity-40">{saving ? "..." : managerCopy.confirm}</button><button type="button" onClick={() => setSheet({ ...sheet, step: "phone" })} className="mt-2 min-h-[52px] w-full font-extrabold text-muted">{managerCopy.back}</button>{error ? <p role="alert" className="mt-3 border border-red-200 bg-red-50 p-3 font-bold text-red-700">{error}</p> : null}</form> : null}

          {sheet.step === "confirm" && sheet.action === "block" ? <div className="pt-5"><BookingSummary fieldName={selectedField?.name ?? ""} date={selectedDate} start={sheet.slot.label} duration={duration} total={total} /><div className="mt-3 flex min-h-14 items-center gap-3 border border-line bg-panel px-4"><LockKeyhole className="h-6 w-6" /><strong>Maintenance</strong></div><button type="button" disabled={!online || saving} onClick={() => void createBlock()} className="manager-action-press mt-5 min-h-14 w-full border border-ink bg-ink text-base font-extrabold text-white disabled:opacity-40">বন্ধ রাখুন</button>{error ? <p className="mt-3 font-bold text-red-700">{error}</p> : null}</div> : null}

          {sheet.step === "confirm" && sheet.action === "price" ? <div className="pt-5"><BookingSummary fieldName={selectedField?.name ?? ""} date={selectedDate} start={sheet.slot.label} duration={duration} total={total} /><label className="mt-4 block text-sm font-extrabold">প্রতি ঘণ্টা<input autoFocus type="number" min="1" value={specialPrice} onChange={(event) => setSpecialPrice(event.target.value)} className="mt-2 min-h-16 w-full border-2 border-line bg-white px-4 text-2xl font-extrabold outline-none focus:border-olive" /></label><button type="button" disabled={!online || saving || Number(specialPrice) < 1} onClick={() => void savePrice()} className="manager-action-press mt-5 min-h-14 w-full border border-olive bg-olive text-base font-extrabold text-white disabled:opacity-40">{managerCopy.save}</button>{error ? <p className="mt-3 font-bold text-red-700">{error}</p> : null}</div> : null}

          {sheet.step === "success" && createdBooking ? <div className="py-6 text-center"><span className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-[#e5f5eb] text-[#17633d]"><Check className="h-14 w-14" strokeWidth={3} /></span><h3 className="mt-5 text-3xl font-extrabold">বুকিং হয়েছে</h3><div className="mt-5 text-left"><BookingSummary fieldName={createdBooking.fieldName} date={createdBooking.date} start={createdBooking.slotRange} duration={createdBooking.slots.length} phone={createdBooking.customerPhone} total={createdBooking.totalAmountBdt} /><div className="mt-3 flex items-center justify-between border border-[#dda26e] bg-[#fff0e2] p-4"><span className="font-bold">বাকি</span><strong className="text-2xl">{formatManagerTaka(createdBooking.balanceAmountBdt)}</strong></div></div><a href={`tel:${createdBooking.customerPhone}`} className="manager-action-press mt-4 inline-flex min-h-14 w-full items-center justify-center gap-2 border border-line bg-white text-base font-extrabold"><Phone className="h-6 w-6" /> {managerCopy.call}</a><button type="button" onClick={closeSheet} className="manager-action-press mt-2 min-h-14 w-full border border-olive bg-olive text-base font-extrabold text-white">{managerCopy.done}</button></div> : null}
        </BottomSheet>
      ) : null}

      {sheet?.kind === "detail" ? <BottomSheet title={slotAppearance(sheet.slot).label} close={closeSheet}><div className="pt-5"><div className={`border p-4 ${slotAppearance(sheet.slot).className}`}><div className="flex items-center justify-between gap-3"><strong className="text-2xl">{sheet.slot.label}</strong><span className="text-lg font-extrabold">{dayMeta(selectedDate).day} {dayMeta(selectedDate).month}</span></div></div>{sheet.slot.occupancy?.booking ? <BookingDetail booking={detailBooking} fallback={sheet.slot.occupancy.booking} /> : null}{sheet.slot.status === "HELD" ? <div className="mt-4 flex min-h-20 items-center gap-3 border border-[#dfc66a] bg-[#fff7d8] p-4"><Clock3 className="h-8 w-8" /><strong>পেমেন্ট চলছে</strong></div> : null}{sheet.slot.occupancy?.block ? <button type="button" disabled={!online || saving} onClick={() => void removeBlock()} className="manager-action-press mt-4 min-h-14 w-full border border-olive bg-white text-base font-extrabold text-olive"><RotateCcw className="mr-2 inline h-6 w-6" /> খুলুন</button> : null}{sheet.slot.status === "CLOSED" ? <button type="button" disabled={!online || saving} onClick={() => void openClosedSlot()} className="manager-action-press mt-4 min-h-14 w-full border border-olive bg-white text-base font-extrabold text-olive"><RotateCcw className="mr-2 inline h-6 w-6" /> খুলুন</button> : null}{sheet.slot.occupancy?.booking ? <><a href={`tel:${detailBooking?.customerPhone ?? sheet.slot.occupancy.booking.customerPhone}`} className="manager-action-press mt-4 inline-flex min-h-14 w-full items-center justify-center gap-2 border border-line bg-white text-base font-extrabold"><Phone className="h-6 w-6" /> {managerCopy.call}</a>{(detailBooking?.balanceAmountBdt ?? sheet.slot.occupancy.booking.balanceAmountBdt) > 0 ? <><button type="button" disabled={!online || saving} onClick={() => void collectPayment(detailBooking?.balanceAmountBdt ?? sheet.slot.occupancy?.booking?.balanceAmountBdt ?? 0)} className="manager-action-press mt-2 min-h-14 w-full border border-[#c77732] bg-[#e7822c] text-base font-extrabold text-white"><Banknote className="mr-2 inline h-6 w-6" /> সব টাকা নিন</button><button type="button" onClick={() => setShowPartial((value) => !value)} className="mt-2 min-h-[52px] w-full font-extrabold text-muted">অল্প টাকা নিন</button>{showPartial ? <div className="grid gap-2 border border-line bg-panel p-3"><input type="number" min="1" max={detailBooking?.balanceAmountBdt} value={partialAmount} onChange={(event) => setPartialAmount(event.target.value)} placeholder="৳ কত" className="min-h-14 border border-line bg-white px-4 text-xl font-extrabold" /><div className="grid grid-cols-4 gap-1">{["Cash", "bKash", "Nagad", "Other"].map((method) => <button key={method} type="button" onClick={() => setPaymentMethod(method)} className={`min-h-[52px] border text-xs font-extrabold ${paymentMethod === method ? "border-olive bg-olive text-white" : "border-line bg-white"}`}>{method}</button>)}</div><button type="button" disabled={!online || Number(partialAmount) < 1} onClick={() => void collectPayment(Number(partialAmount))} className="min-h-14 bg-ink font-extrabold text-white">{managerCopy.confirm}</button></div> : null}</> : null}<button type="button" onClick={() => setShowMore((value) => !value)} className="mt-3 min-h-[52px] w-full border border-line bg-white font-extrabold">আরও</button>{showMore ? <div className="mt-2 grid gap-2 border border-line bg-panel p-3"><Link href={`/manager/bookings?query=${encodeURIComponent(detailBooking?.invoiceNumber ?? sheet.slot.occupancy.booking.invoiceNumber)}`} className="grid min-h-[52px] place-items-center border border-line bg-white font-extrabold">সময় বদলান</Link>{confirmCancel ? <div className="border border-red-200 bg-red-50 p-3"><p className="font-bold text-red-800">{detailBooking?.customerPhone ?? sheet.slot.occupancy.booking.customerPhone}</p><p className="mt-1 text-sm text-red-700">{detailBooking?.slotRange ?? sheet.slot.label}</p><button type="button" disabled={!online || saving} onClick={() => void cancelBooking()} className="mt-3 min-h-[52px] w-full bg-red-700 font-extrabold text-white">বাতিল নিশ্চিত করুন</button></div> : <button type="button" onClick={() => setConfirmCancel(true)} className="min-h-[52px] border border-red-200 bg-white font-extrabold text-red-700">বুকিং বাতিল</button>}</div> : null}</> : null}{error ? <p role="alert" className="mt-3 border border-red-200 bg-red-50 p-3 font-bold text-red-700">{error}</p> : null}</div></BottomSheet> : null}

      {practiceOpen ? <ManagerPracticeGuide onClose={() => { window.localStorage.setItem("zenvy-manager-practice-v1", "seen"); setPracticeOpen(false); }} /> : null}
    </main>
  );
}

function BookingSummary({ fieldName, date, start, duration, phone, total }: { fieldName: string; date: string; start: string; duration: number; phone?: string; total: number }) {
  return <dl className="grid gap-px bg-line"><div className="flex justify-between gap-4 bg-white p-4"><dt className="text-muted">মাঠ</dt><dd className="text-right font-extrabold">{fieldName}</dd></div><div className="flex justify-between gap-4 bg-white p-4"><dt className="text-muted">দিন</dt><dd className="text-right font-extrabold">{dayMeta(date).long}</dd></div><div className="flex justify-between gap-4 bg-white p-4"><dt className="text-muted">সময়</dt><dd className="text-right font-extrabold">{start} · {duration} ঘণ্টা</dd></div>{phone ? <div className="flex justify-between gap-4 bg-white p-4"><dt className="text-muted">ফোন</dt><dd className="text-right font-extrabold">{phone}</dd></div> : null}<div className="flex justify-between gap-4 bg-white p-4"><dt className="text-muted">মোট</dt><dd className="text-right text-xl font-extrabold">{formatManagerTaka(total)}</dd></div></dl>;
}

function BookingDetail({ booking, fallback }: { booking: ManagerBooking | null; fallback: NonNullable<AvailabilitySlot["occupancy"]>["booking"] }) {
  const source = booking ?? fallback;
  if (!source) return null;
  return <dl className="mt-3 grid gap-px bg-line"><div className="flex justify-between gap-4 bg-white p-4"><dt className="text-muted">ফোন</dt><dd className="font-extrabold">{source.customerPhone}</dd></div>{source.customerName ? <div className="flex justify-between gap-4 bg-white p-4"><dt className="text-muted">নাম</dt><dd className="font-extrabold">{source.customerName}</dd></div> : null}<div className="flex justify-between gap-4 bg-white p-4"><dt className="text-muted">মোট</dt><dd className="font-extrabold">{formatManagerTaka(source.totalAmountBdt)}</dd></div><div className="flex justify-between gap-4 bg-white p-4"><dt className="text-muted">বাকি</dt><dd className="text-xl font-extrabold">{formatManagerTaka(source.balanceAmountBdt)}</dd></div></dl>;
}
