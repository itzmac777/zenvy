"use client";

import Link from "next/link";
import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Ban, Check, ChevronLeft, ChevronRight, CircleDollarSign, Clock3, Plus, RefreshCw, UserRound, X } from "lucide-react";
import { dateKey, formatBdt, managerApi, type AvailabilityResponse, type AvailabilitySlot, type ManagerBooking } from "@/lib/manager-api";
import { useManagerWorkspace } from "@/components/ManagerShell";
import { SimpleManagerSchedule } from "@/components/SimpleManagerSchedule";
import { simpleManagerUi } from "@/lib/manager-ui";

type ScheduleMode = "today" | "calendar";
type SheetMode = "booking" | "block" | "price" | "detail" | null;

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

function statusLabel(slot: AvailabilitySlot) {
  if (slot.status === "AVAILABLE") return "Available";
  if (slot.status === "HELD") return "Payment hold";
  if (slot.status === "MANUAL_BOOKED") return "Manual booking";
  if (slot.status === "BOOKED") return "Online booking";
  if (slot.status === "BLOCKED") return slot.occupancy?.block?.reason ?? "Blocked";
  return "Closed";
}

function statusClasses(slot: AvailabilitySlot, selected: boolean) {
  if (selected) return "border-olive bg-[#eef0ff] text-ink shadow-[inset_4px_0_0_#5363f1]";
  if (slot.status === "AVAILABLE") return "border-line bg-white hover:border-olive/55 hover:bg-[#fafaff]";
  if (slot.status === "HELD") return "border-[#d8c78f] bg-[#fff9e8]";
  if (slot.status === "BOOKED") return "border-[#aeb7f8] bg-[#f1f3ff]";
  if (slot.status === "MANUAL_BOOKED") return "border-[#a8cec1] bg-[#eff9f5]";
  if (slot.status === "BLOCKED") return "border-[#d6b0ae] bg-[#fff3f2]";
  return "border-line/70 bg-panel/60 text-muted/60";
}

function ActionSheet({ title, eyebrow, children, close }: { title: string; eyebrow: string; children: ReactNode; close: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] bg-ink/30 backdrop-blur-[2px]">
      <button type="button" aria-label="Close action panel" className="absolute inset-0 h-full w-full cursor-default" onClick={close} />
      <aside className="absolute inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto border-t border-line bg-paper p-5 shadow-[0_-24px_70px_rgba(23,22,19,0.18)] md:inset-y-4 md:left-auto md:right-4 md:w-[480px] md:border">
        <header className="flex items-start justify-between gap-4 border-b border-line pb-4">
          <div><p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted">{eyebrow}</p><h2 className="mt-2 font-serif text-[32px] font-normal leading-none">{title}</h2></div>
          <button type="button" aria-label="Close" onClick={close} className="grid h-11 w-11 shrink-0 place-items-center border border-line bg-white"><X className="h-5 w-5" /></button>
        </header>
        {children}
      </aside>
    </div>
  );
}

export function ManagerSchedule({ mode = "today" }: { mode?: ScheduleMode }) {
  if (simpleManagerUi) return <SimpleManagerSchedule />;
  return <ClassicManagerSchedule mode={mode} />;
}

function ClassicManagerSchedule({ mode = "today" }: { mode?: ScheduleMode }) {
  const { fields, selectedField, setSelectedFieldId } = useManagerWorkspace();
  const [anchorDate, setAnchorDate] = useState(() => dateKey(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [selectedStarts, setSelectedStarts] = useState<string[]>([]);
  const [detailSlot, setDetailSlot] = useState<AvailabilitySlot | null>(null);
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [manual, setManual] = useState({ phone: "", name: "", email: "", paid: "0", method: "Cash", notes: "" });
  const [block, setBlock] = useState({ reason: "Maintenance", note: "" });
  const [specialPrice, setSpecialPrice] = useState("");
  const rangeDays = mode === "calendar" ? 7 : 7;
  const rangeEnd = addDays(anchorDate, rangeDays - 1);

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
      setSelectedDate((current) => data.days.some((day) => day.date === current) ? current : (data.days[0]?.date ?? anchorDate));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load availability.");
    } finally {
      setLoading(false);
    }
  }, [selectedField, anchorDate, rangeEnd]);

  useEffect(() => { void load(); }, [load]);

  const selectedDay = availability?.days.find((day) => day.date === selectedDate) ?? availability?.days[0];
  const selectedSlots = useMemo(() => selectedDay?.slots.filter((slot) => selectedStarts.includes(slot.startAt)) ?? [], [selectedDay, selectedStarts]);
  const selectedTotal = selectedSlots.reduce((sum, slot) => sum + slot.priceBdt, 0);
  const summary = useMemo(() => {
    const slots = selectedDay?.slots ?? [];
    return {
      available: slots.filter((slot) => slot.status === "AVAILABLE").length,
      booked: slots.filter((slot) => slot.status === "BOOKED" || slot.status === "MANUAL_BOOKED").length,
      held: slots.filter((slot) => slot.status === "HELD").length,
      blocked: slots.filter((slot) => slot.status === "BLOCKED").length,
    };
  }, [selectedDay]);

  function selectDate(value: string) {
    setSelectedDate(value);
    setSelectedStarts([]);
    setSheetMode(null);
  }

  function clickSlot(slot: AvailabilitySlot) {
    setNotice("");
    if (slot.status !== "AVAILABLE") {
      setDetailSlot(slot);
      setSheetMode("detail");
      return;
    }
    const slots = selectedDay?.slots ?? [];
    const index = slots.findIndex((item) => item.startAt === slot.startAt);
    setSelectedStarts((current) => {
      if (current.includes(slot.startAt)) {
        const currentIndexes = current.map((start) => slots.findIndex((item) => item.startAt === start)).sort((a, b) => a - b);
        const clickedPosition = currentIndexes.indexOf(index);
        if (clickedPosition === 0) return current.filter((start) => start !== slot.startAt);
        if (clickedPosition === currentIndexes.length - 1) return current.filter((start) => start !== slot.startAt);
        return [slot.startAt];
      }
      if (!current.length) return [slot.startAt];
      const indexes = [...current.map((start) => slots.findIndex((item) => item.startAt === start)), index];
      const first = Math.min(...indexes);
      const last = Math.max(...indexes);
      const range = slots.slice(first, last + 1);
      return range.every((item) => item.status === "AVAILABLE") ? range.map((item) => item.startAt) : [slot.startAt];
    });
  }

  function closeSheet() {
    setSheetMode(null);
    setDetailSlot(null);
    setError("");
  }

  async function createManualBooking(event: FormEvent) {
    event.preventDefault();
    if (!selectedField) return;
    setSaving(true);
    setError("");
    try {
      const data = await managerApi<{ booking: ManagerBooking }>("/api/manager/manual-bookings", {
        method: "POST",
        body: JSON.stringify({
          fieldId: selectedField.id,
          slotStartAts: selectedStarts,
          customerPhone: manual.phone,
          customerName: manual.name || undefined,
          customerEmail: manual.email || undefined,
          notes: manual.notes || undefined,
          paidAmountBdt: Number(manual.paid || 0),
          paymentMethod: manual.method,
        }),
      });
      setNotice(`Booking ${data.booking.invoiceNumber} created.`);
      setSelectedStarts([]);
      setManual({ phone: "", name: "", email: "", paid: "0", method: "Cash", notes: "" });
      closeSheet();
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create booking.");
    } finally {
      setSaving(false);
    }
  }

  async function createBlock(event: FormEvent) {
    event.preventDefault();
    if (!selectedField) return;
    setSaving(true);
    setError("");
    try {
      await managerApi("/api/manager/blocks", { method: "POST", body: JSON.stringify({ fieldId: selectedField.id, slotStartAts: selectedStarts, reason: block.reason, note: block.note || undefined }) });
      setNotice("Selected slots blocked.");
      setSelectedStarts([]);
      closeSheet();
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to block slots.");
    } finally {
      setSaving(false);
    }
  }

  async function savePrice(event: FormEvent) {
    event.preventDefault();
    if (!selectedField) return;
    setSaving(true);
    setError("");
    try {
      await managerApi("/api/manager/slot-overrides", { method: "POST", body: JSON.stringify({ fieldId: selectedField.id, slotStartAts: selectedStarts, priceBdt: Number(specialPrice), availability: "DEFAULT" }) });
      setNotice("Special slot price saved.");
      setSelectedStarts([]);
      closeSheet();
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update price.");
    } finally {
      setSaving(false);
    }
  }

  async function cancelBooking() {
    const booking = detailSlot?.occupancy?.booking;
    if (!booking) return;
    setSaving(true);
    try {
      await managerApi(`/api/manager/bookings/${booking.id}/cancel`, { method: "POST" });
      setNotice("Booking cancelled and slots released.");
      closeSheet();
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to cancel booking.");
    } finally { setSaving(false); }
  }

  async function removeBlock() {
    const blockId = detailSlot?.occupancy?.block?.id;
    if (!blockId) return;
    setSaving(true);
    try {
      await managerApi(`/api/manager/blocks/${blockId}`, { method: "DELETE" });
      setNotice("Block removed.");
      closeSheet();
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to remove block.");
    } finally { setSaving(false); }
  }

  if (!fields.length) {
    return (
      <main className="mx-auto max-w-[1200px] px-5 py-10 md:px-8">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.13em] text-muted">Today</p>
        <h1 className="mt-2 font-serif text-[42px] font-normal leading-none md:text-[56px]">Your schedule starts with a field.</h1>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">Add playing details, opening hours, and pricing before taking your first booking.</p>
        <Link href="/manager/fields/new" className="mt-7 inline-flex min-h-12 items-center gap-2 border border-olive bg-olive px-6 text-sm font-bold text-white"><Plus className="h-4 w-4" /> Create first field</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1280px] px-4 py-5 md:px-7 md:py-8 xl:px-10">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted">{mode === "calendar" ? "Field calendar" : "Daily operations"}</p>
          <h1 className="mt-1 font-serif text-[38px] font-normal leading-none md:text-[50px]">{mode === "calendar" ? "Calendar" : "Today"}</h1>
        </div>
        <button type="button" onClick={() => void load()} aria-label="Refresh schedule" className="grid h-11 w-11 place-items-center border border-line bg-white text-muted hover:text-ink"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button>
      </header>

      <div className="scrollbar-none -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 md:hidden">
        {fields.map((field) => <button key={field.id} type="button" onClick={() => setSelectedFieldId(field.id)} className={`min-h-11 shrink-0 border px-4 text-xs font-bold ${selectedField?.id === field.id ? "border-olive bg-olive text-white" : "border-line bg-white"}`}>{field.name}</button>)}
      </div>

      <section className="sticky top-[68px] z-30 -mx-4 mt-4 border-y border-line bg-paper/95 px-4 py-3 backdrop-blur-xl md:static md:mx-0 md:border md:bg-white/75" aria-label="Date selector">
        <div className="flex items-center gap-2">
          {mode === "calendar" ? <button type="button" onClick={() => { const next = addDays(anchorDate, -7); setAnchorDate(next); setSelectedDate(next); setSelectedStarts([]); }} className="grid h-11 w-11 shrink-0 place-items-center border border-line bg-white" aria-label="Previous week"><ChevronLeft className="h-4 w-4" /></button> : null}
          <div className="scrollbar-none flex min-w-0 flex-1 gap-2 overflow-x-auto">
            {(availability?.days ?? Array.from({ length: 7 }, (_, index) => ({ date: addDays(anchorDate, index), slots: [] }))).map((day) => {
              const meta = dayMeta(day.date);
              const active = selectedDate === day.date;
              return <button key={day.date} type="button" onClick={() => selectDate(day.date)} className={`grid min-h-[62px] min-w-[64px] place-items-center border px-2 text-center ${active ? "border-olive bg-olive text-white" : "border-line bg-white"}`}><span className="text-[10px] font-bold uppercase">{day.date === dateKey(new Date()) ? "Today" : meta.weekday}</span><strong className="text-lg leading-none">{meta.day}</strong><span className="text-[10px] opacity-75">{meta.month}</span></button>;
            })}
          </div>
          {mode === "calendar" ? <button type="button" onClick={() => { const next = addDays(anchorDate, 7); setAnchorDate(next); setSelectedDate(next); setSelectedStarts([]); }} className="grid h-11 w-11 shrink-0 place-items-center border border-line bg-white" aria-label="Next week"><ChevronRight className="h-4 w-4" /></button> : null}
        </div>
      </section>

      {notice ? <div role="status" className="mt-4 flex items-center gap-3 border border-olive/25 bg-[#eef0ff] px-4 py-3 text-sm font-semibold"><span className="grid h-7 w-7 place-items-center rounded-full bg-olive text-white"><Check className="h-4 w-4" /></span>{notice}</div> : null}
      {error && !sheetMode ? <p role="alert" className="mt-4 border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section>
          <div className="flex items-center justify-between gap-4 border-b border-line pb-4">
            <div><h2 className="font-serif text-[28px] font-normal leading-none">{dayMeta(selectedDate).long}</h2><p className="mt-2 text-xs text-muted">{selectedField?.name} · one-hour slots</p></div>
            <span className="hidden text-xs font-bold text-muted sm:block">{summary.available} open</span>
          </div>

          <div className="mt-3 grid gap-2">
            {loading && !selectedDay ? <div className="grid min-h-52 place-items-center text-sm text-muted">Loading schedule...</div> : null}
            {!loading && selectedDay?.slots.length === 0 ? <div className="border border-line bg-white/70 p-8 text-center"><Clock3 className="mx-auto h-6 w-6 text-muted" /><p className="mt-3 font-bold">Closed for this day</p><p className="mt-1 text-sm text-muted">Update weekly hours in field settings.</p></div> : null}
            {selectedDay?.slots.map((slot) => {
              const selected = selectedStarts.includes(slot.startAt);
              return (
                <button key={slot.startAt} type="button" disabled={slot.status === "CLOSED"} onClick={() => clickSlot(slot)} className={`grid min-h-[64px] grid-cols-[82px_minmax(0,1fr)_auto] items-center gap-3 border px-3 text-left transition md:grid-cols-[110px_minmax(0,1fr)_120px] md:px-4 ${statusClasses(slot, selected)}`}>
                  <strong className="text-sm">{slot.label}</strong>
                  <span className="min-w-0"><span className="block truncate text-xs font-bold">{statusLabel(slot)}</span>{slot.occupancy?.booking ? <span className="mt-1 block truncate text-[11px] text-muted">{slot.occupancy.booking.customerName || slot.occupancy.booking.customerPhone}</span> : null}</span>
                  <span className="text-right"><strong className="block text-sm">{formatBdt(slot.priceBdt)}</strong>{selected ? <span className="mt-1 block text-[10px] font-bold text-olive">Selected</span> : null}</span>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="hidden self-start border border-line bg-white/75 p-5 lg:block">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted">Day summary</p>
          <div className="mt-4 grid grid-cols-2 gap-px bg-line">
            {[{ label: "Available", value: summary.available }, { label: "Booked", value: summary.booked }, { label: "On hold", value: summary.held }, { label: "Blocked", value: summary.blocked }].map((item) => <div key={item.label} className="bg-[#fffefd] p-4"><strong className="font-serif text-2xl font-normal">{item.value}</strong><span className="mt-1 block text-[11px] text-muted">{item.label}</span></div>)}
          </div>
          <Link href={selectedField ? `/manager/fields/${selectedField.id}` : "/manager/fields"} className="mt-5 inline-flex min-h-11 w-full items-center justify-center border border-line bg-white px-4 text-xs font-bold">Field settings</Link>
        </aside>
      </div>

      {selectedStarts.length ? (
        <div className="fixed inset-x-3 bottom-[calc(74px+env(safe-area-inset-bottom))] z-40 border border-line bg-[#fffefd]/98 p-3 shadow-[0_18px_60px_rgba(23,22,19,0.2)] backdrop-blur-xl md:inset-x-auto md:bottom-5 md:right-5 md:w-[520px]">
          <div className="flex items-center justify-between gap-3"><div><strong className="text-sm">{selectedStarts.length} hour{selectedStarts.length > 1 ? "s" : ""} selected</strong><span className="ml-2 text-xs text-muted">{formatBdt(selectedTotal)}</span></div><button type="button" onClick={() => setSelectedStarts([])} className="text-xs font-bold text-muted">Clear</button></div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button type="button" onClick={() => setSheetMode("booking")} className="inline-flex min-h-11 items-center justify-center gap-1.5 border border-olive bg-olive px-2 text-[11px] font-bold text-white"><UserRound className="h-4 w-4" /> Book</button>
            <button type="button" onClick={() => setSheetMode("block")} className="inline-flex min-h-11 items-center justify-center gap-1.5 border border-line bg-white px-2 text-[11px] font-bold"><Ban className="h-4 w-4" /> Block</button>
            <button type="button" onClick={() => { setSpecialPrice(String(selectedSlots[0]?.priceBdt ?? "")); setSheetMode("price"); }} className="inline-flex min-h-11 items-center justify-center gap-1.5 border border-line bg-white px-2 text-[11px] font-bold"><CircleDollarSign className="h-4 w-4" /> Price</button>
          </div>
        </div>
      ) : null}

      {sheetMode === "booking" ? (
        <ActionSheet eyebrow="Manual booking" title="Reserve selected slots" close={closeSheet}>
          <form onSubmit={createManualBooking} className="mt-5 grid gap-4">
            <div className="border border-line bg-white p-4 text-sm"><div className="flex justify-between gap-4"><span>{dayMeta(selectedDate).long}<small className="mt-1 block text-muted">{selectedSlots[0]?.label} · {selectedStarts.length} hr</small></span><strong>{formatBdt(selectedTotal)}</strong></div></div>
            <label className="grid gap-2 text-sm font-bold">Contact phone<input required inputMode="tel" value={manual.phone} onChange={(event) => setManual({ ...manual, phone: event.target.value })} placeholder="01XXXXXXXXX" className="min-h-12 border border-line bg-white px-3 font-normal outline-none focus:border-olive" /></label>
            <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-bold">Customer name<input value={manual.name} onChange={(event) => setManual({ ...manual, name: event.target.value })} className="min-h-12 border border-line bg-white px-3 font-normal outline-none focus:border-olive" /></label><label className="grid gap-2 text-sm font-bold">Email<input type="email" value={manual.email} onChange={(event) => setManual({ ...manual, email: event.target.value })} className="min-h-12 border border-line bg-white px-3 font-normal outline-none focus:border-olive" /></label></div>
            <div className="grid grid-cols-2 gap-4"><label className="grid gap-2 text-sm font-bold">Amount collected<input type="number" min="0" max={selectedTotal} value={manual.paid} onChange={(event) => setManual({ ...manual, paid: event.target.value })} className="min-h-12 border border-line bg-white px-3 font-normal outline-none focus:border-olive" /></label><label className="grid gap-2 text-sm font-bold">Method<select value={manual.method} onChange={(event) => setManual({ ...manual, method: event.target.value })} className="min-h-12 border border-line bg-white px-3 font-normal outline-none focus:border-olive">{["Cash", "bKash", "Nagad", "Rocket", "Upay", "Card", "Bank", "Other"].map((method) => <option key={method}>{method}</option>)}</select></label></div>
            <label className="grid gap-2 text-sm font-bold">Notes<textarea value={manual.notes} onChange={(event) => setManual({ ...manual, notes: event.target.value })} className="min-h-24 border border-line bg-white px-3 py-3 font-normal outline-none focus:border-olive" /></label>
            {error ? <p role="alert" className="border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
            <button disabled={saving} className="min-h-12 border border-olive bg-olive px-5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Creating booking..." : "Mark as booked"}</button>
          </form>
        </ActionSheet>
      ) : null}

      {sheetMode === "block" ? <ActionSheet eyebrow="Availability" title="Block selected slots" close={closeSheet}><form onSubmit={createBlock} className="mt-5 grid gap-4"><label className="grid gap-2 text-sm font-bold">Reason<select value={block.reason} onChange={(event) => setBlock({ ...block, reason: event.target.value })} className="min-h-12 border border-line bg-white px-3 font-normal">{["Maintenance", "Private event", "Field closure", "Other"].map((reason) => <option key={reason}>{reason}</option>)}</select></label><label className="grid gap-2 text-sm font-bold">Note<textarea value={block.note} onChange={(event) => setBlock({ ...block, note: event.target.value })} className="min-h-24 border border-line bg-white px-3 py-3 font-normal" /></label>{error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}<button disabled={saving} className="min-h-12 border border-ink bg-ink px-5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Blocking..." : `Block ${selectedStarts.length} slot${selectedStarts.length > 1 ? "s" : ""}`}</button></form></ActionSheet> : null}

      {sheetMode === "price" ? <ActionSheet eyebrow="Date override" title="Set a special price" close={closeSheet}><form onSubmit={savePrice} className="mt-5 grid gap-4"><p className="text-sm leading-relaxed text-muted">This price applies only to the selected {selectedStarts.length} slot{selectedStarts.length > 1 ? "s" : ""} on {dayMeta(selectedDate).long}.</p><label className="grid gap-2 text-sm font-bold">Price per hour (BDT)<input required type="number" min="1" value={specialPrice} onChange={(event) => setSpecialPrice(event.target.value)} className="min-h-12 border border-line bg-white px-3 text-lg font-bold outline-none focus:border-olive" /></label>{error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}<button disabled={saving} className="min-h-12 border border-olive bg-olive px-5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving..." : "Save special price"}</button></form></ActionSheet> : null}

      {sheetMode === "detail" && detailSlot ? <ActionSheet eyebrow={statusLabel(detailSlot)} title={detailSlot.label} close={closeSheet}><div className="mt-5 grid gap-4"><div className="border border-line bg-white p-4 text-sm"><div className="flex justify-between"><span>{dayMeta(selectedDate).long}</span><strong>{formatBdt(detailSlot.priceBdt)}</strong></div></div>{detailSlot.occupancy?.booking ? <><dl className="grid gap-px bg-line text-sm"><div className="flex justify-between gap-4 bg-[#fffefd] p-4"><dt className="text-muted">Customer</dt><dd className="text-right font-bold">{detailSlot.occupancy.booking.customerName || "Walk-in"}<small className="block font-normal text-muted">{detailSlot.occupancy.booking.customerPhone}</small></dd></div><div className="flex justify-between gap-4 bg-[#fffefd] p-4"><dt className="text-muted">Invoice</dt><dd className="font-bold">{detailSlot.occupancy.booking.invoiceNumber}</dd></div><div className="flex justify-between gap-4 bg-[#fffefd] p-4"><dt className="text-muted">Balance</dt><dd className="font-bold">{formatBdt(detailSlot.occupancy.booking.balanceAmountBdt)}</dd></div></dl><Link href={`/manager/bookings?query=${encodeURIComponent(detailSlot.occupancy.booking.invoiceNumber)}`} className="inline-flex min-h-11 items-center justify-center border border-line bg-white px-4 text-sm font-bold">Open booking</Link><button type="button" disabled={saving} onClick={() => void cancelBooking()} className="min-h-11 border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-700">Cancel and release slots</button></> : null}{detailSlot.occupancy?.block ? <><div className="border border-line bg-white p-4"><strong>{detailSlot.occupancy.block.reason}</strong>{detailSlot.occupancy.block.note ? <p className="mt-2 text-sm text-muted">{detailSlot.occupancy.block.note}</p> : null}</div><button type="button" disabled={saving} onClick={() => void removeBlock()} className="min-h-11 border border-line bg-white px-4 text-sm font-bold">Remove block</button></> : null}{detailSlot.status === "HELD" ? <p className="border border-[#d8c78f] bg-[#fff9e8] p-4 text-sm leading-relaxed">A player is completing payment for this slot. It will reopen automatically if the ten-minute hold expires.</p> : null}{error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}</div></ActionSheet> : null}
    </main>
  );
}
