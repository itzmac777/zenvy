"use client";

import { useSearchParams } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Banknote, CalendarClock, CalendarRange, Check, ChevronRight, LoaderCircle, Search, X } from "lucide-react";
import { useManagerWorkspace } from "@/components/ManagerShell";
import { dateKey, formatBdt, managerApi, type AvailabilityResponse, type ManagerBooking } from "@/lib/manager-api";

const statuses = ["ALL", "CONFIRMED", "PENDING_PAYMENT", "CANCELLED", "EXPIRED"] as const;

function statusLabel(status: string) {
  return status.replaceAll("_", " ").toLowerCase();
}

export function ManagerBookingsClient() {
  const searchParams = useSearchParams();
  const { fields } = useManagerWorkspace();
  const [query, setQuery] = useState(searchParams.get("query") ?? "");
  const [submittedQuery, setSubmittedQuery] = useState(searchParams.get("query") ?? "");
  const [status, setStatus] = useState<(typeof statuses)[number]>("ALL");
  const [fieldId, setFieldId] = useState("");
  const [bookings, setBookings] = useState<ManagerBooking[]>([]);
  const [selected, setSelected] = useState<ManagerBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [payment, setPayment] = useState({ amount: "", method: "Cash" });

  const load = useCallback(async (nextQuery: string, nextStatus: (typeof statuses)[number], nextField: string) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (nextQuery.trim()) params.set("query", nextQuery.trim());
      if (nextStatus !== "ALL") params.set("status", nextStatus);
      if (nextField) params.set("fieldId", nextField);
      const data = await managerApi<{ bookings: ManagerBooking[] }>(`/api/manager/bookings?${params}`);
      setBookings(data.bookings);
      setSelected((current) => current ? (data.bookings.find((booking) => booking.id === current.id) ?? null) : null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load bookings.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(submittedQuery, status, fieldId); }, [load, submittedQuery, status, fieldId]);

  async function addPayment(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      const data = await managerApi<{ booking: ManagerBooking }>(`/api/manager/bookings/${selected.id}/payment`, { method: "POST", body: JSON.stringify({ amountBdt: Number(payment.amount), method: payment.method }) });
      setSelected(data.booking);
      setBookings((current) => current.map((booking) => booking.id === data.booking.id ? data.booking : booking));
      setPayment({ amount: "", method: "Cash" });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to record payment.");
    } finally { setSaving(false); }
  }

  async function cancelBooking() {
    if (!selected) return;
    setSaving(true);
    try {
      const data = await managerApi<{ booking: ManagerBooking }>(`/api/manager/bookings/${selected.id}/cancel`, { method: "POST" });
      setSelected(data.booking);
      setBookings((current) => current.map((booking) => booking.id === data.booking.id ? data.booking : booking));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to cancel booking.");
    } finally { setSaving(false); }
  }

  async function rescheduleBooking(slotStartAts: string[]) {
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      const data = await managerApi<{ booking: ManagerBooking }>(`/api/manager/bookings/${selected.id}/reschedule`, {
        method: "POST",
        body: JSON.stringify({ slotStartAts }),
      });
      setSelected(data.booking);
      setBookings((current) => current.map((booking) => booking.id === data.booking.id ? data.booking : booking));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to reschedule this booking.");
      throw requestError;
    } finally { setSaving(false); }
  }

  return (
    <main className="mx-auto max-w-[1240px] px-4 py-6 md:px-8 md:py-9">
      <header><p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted">Player and walk-in records</p><h1 className="mt-2 font-serif text-[42px] font-normal leading-none md:text-[56px]">Bookings</h1></header>

      <section className="mt-6 grid gap-3 border-y border-line bg-white/60 py-4 md:grid-cols-[1fr_180px] md:border md:p-4">
        <form onSubmit={(event) => { event.preventDefault(); setSubmittedQuery(query.trim()); }} className="grid grid-cols-[1fr_auto]">
          <label className="relative"><span className="sr-only">Search bookings</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Invoice, phone, or customer" className="min-h-12 w-full border border-line bg-white pl-10 pr-3 text-sm outline-none focus:border-olive" /></label>
          <button className="min-h-12 border border-olive bg-olive px-5 text-sm font-bold text-white">Search</button>
        </form>
        <select aria-label="Filter by field" value={fieldId} onChange={(event) => setFieldId(event.target.value)} className="min-h-12 border border-line bg-white px-3 text-sm font-bold outline-none"><option value="">All fields</option>{fields.map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}</select>
        <div className="scrollbar-none flex gap-2 overflow-x-auto md:col-span-2">{statuses.map((item) => <button key={item} type="button" onClick={() => setStatus(item)} className={`min-h-10 shrink-0 border px-3 text-[11px] font-bold capitalize ${status === item ? "border-olive bg-[#eef0ff] text-olive-dark" : "border-line bg-white text-muted"}`}>{statusLabel(item)}</button>)}</div>
      </section>

      {error && !selected ? <p className="mt-4 border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="grid content-start gap-2">
          {loading ? <div className="grid min-h-48 place-items-center text-sm text-muted">Loading bookings...</div> : null}
          {!loading && !bookings.length ? <div className="border border-line bg-white/70 p-8 text-center"><CalendarClock className="mx-auto h-6 w-6 text-muted" /><p className="mt-3 font-bold">No matching bookings</p><p className="mt-1 text-sm text-muted">Try another status, field, or search.</p></div> : null}
          {bookings.map((booking) => (
            <button key={booking.id} type="button" onClick={() => { setSelected(booking); setPayment({ amount: String(booking.balanceAmountBdt || ""), method: "Cash" }); setError(""); }} className={`grid min-h-[92px] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border p-4 text-left transition hover:border-olive/45 hover:bg-white ${selected?.id === booking.id ? "border-olive bg-[#f5f6ff]" : "border-line bg-white/75"}`}>
              <span className="min-w-0"><span className="flex flex-wrap items-center gap-2"><strong className="truncate font-serif text-[23px] font-normal leading-none">{booking.customerName || booking.customerPhone}</strong><small className="border border-line px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.08em] text-muted">{booking.source === "MANAGER" ? "manual" : "online"}</small></span><span className="mt-2 block truncate text-xs font-bold">{booking.fieldName} · {booking.date}, {booking.slotRange}</span><span className="mt-1 block text-[11px] text-muted">{booking.invoiceNumber} · {statusLabel(booking.status)}</span></span>
              <span className="text-right"><strong className="block text-sm">{formatBdt(booking.totalAmountBdt)}</strong>{booking.balanceAmountBdt > 0 ? <span className="mt-1 block text-[10px] font-bold text-[#9a641c]">{formatBdt(booking.balanceAmountBdt)} due</span> : <span className="mt-1 block text-[10px] font-bold text-[#2d765f]">Paid</span>}<ChevronRight className="ml-auto mt-2 h-4 w-4 text-muted" /></span>
            </button>
          ))}
        </section>

        <aside className="hidden self-start border border-line bg-[#fffefd]/95 p-5 lg:block">
          {selected ? <BookingDetail booking={selected} payment={payment} setPayment={setPayment} saving={saving} error={error} addPayment={addPayment} reschedule={rescheduleBooking} cancel={() => void cancelBooking()} close={() => setSelected(null)} /> : <div className="py-12 text-center"><Banknote className="mx-auto h-6 w-6 text-muted" /><p className="mt-3 text-sm font-bold">Select a booking</p><p className="mt-1 text-xs text-muted">Customer and payment details appear here.</p></div>}
        </aside>
      </div>

      {selected ? <div className="fixed inset-0 z-[70] bg-ink/30 lg:hidden"><button type="button" aria-label="Close booking details" onClick={() => setSelected(null)} className="absolute inset-0 h-full w-full" /><aside className="absolute inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto border-t border-line bg-paper p-5"><BookingDetail booking={selected} payment={payment} setPayment={setPayment} saving={saving} error={error} addPayment={addPayment} reschedule={rescheduleBooking} cancel={() => void cancelBooking()} close={() => setSelected(null)} /></aside></div> : null}
    </main>
  );
}

function BookingDetail({ booking, payment, setPayment, saving, error, addPayment, reschedule, cancel, close }: { booking: ManagerBooking; payment: { amount: string; method: string }; setPayment: (value: { amount: string; method: string }) => void; saving: boolean; error: string; addPayment: (event: FormEvent) => void; reschedule: (slots: string[]) => Promise<void>; cancel: () => void; close: () => void }) {
  return <div>
    <header className="flex items-start justify-between gap-3 border-b border-line pb-4"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted">{booking.invoiceNumber}</p><h2 className="mt-2 font-serif text-[30px] font-normal leading-none">{booking.customerName || "Walk-in booking"}</h2><p className="mt-2 text-xs text-muted">{booking.customerPhone}</p></div><button type="button" aria-label="Close" onClick={close} className="grid h-11 w-11 shrink-0 place-items-center border border-line bg-white"><X className="h-4 w-4" /></button></header>
    <dl className="mt-4 grid gap-px bg-line text-sm"><div className="bg-[#fffefd] p-3"><dt className="text-xs text-muted">Field and slot</dt><dd className="mt-1 font-bold">{booking.fieldName}<small className="block font-normal text-muted">{booking.date}, {booking.slotRange}</small></dd></div><div className="grid grid-cols-2 gap-px"><div className="bg-[#fffefd] p-3"><dt className="text-xs text-muted">Total</dt><dd className="mt-1 font-bold">{formatBdt(booking.totalAmountBdt)}</dd></div><div className="bg-[#fffefd] p-3"><dt className="text-xs text-muted">Remaining</dt><dd className="mt-1 font-bold">{formatBdt(booking.balanceAmountBdt)}</dd></div></div><div className="bg-[#fffefd] p-3"><dt className="text-xs text-muted">Status</dt><dd className="mt-1 flex items-center gap-2 font-bold capitalize"><span className={`h-2 w-2 rounded-full ${booking.status === "CONFIRMED" ? "bg-[#2d765f]" : "bg-[#b4822b]"}`} />{statusLabel(booking.status)}</dd></div></dl>
    {booking.balanceAmountBdt > 0 && booking.status === "CONFIRMED" ? <form onSubmit={addPayment} className="mt-5 grid gap-3 border-t border-line pt-5"><h3 className="text-sm font-bold">Record payment</h3><div className="grid grid-cols-[1fr_120px] gap-2"><input required type="number" min="1" max={booking.balanceAmountBdt} value={payment.amount} onChange={(event) => setPayment({ ...payment, amount: event.target.value })} className="min-h-11 border border-line bg-white px-3 text-sm outline-none focus:border-olive" /><select value={payment.method} onChange={(event) => setPayment({ ...payment, method: event.target.value })} className="min-h-11 border border-line bg-white px-2 text-xs font-bold">{["Cash", "bKash", "Nagad", "Rocket", "Upay", "Card", "Bank", "Other"].map((method) => <option key={method}>{method}</option>)}</select></div><button disabled={saving} className="min-h-11 border border-olive bg-olive px-4 text-sm font-bold text-white">Mark amount paid</button></form> : booking.balanceAmountBdt === 0 ? <p className="mt-5 flex items-center gap-2 border border-[#a8cec1] bg-[#eff9f5] p-3 text-sm font-bold text-[#245f4d]"><Check className="h-4 w-4" /> Paid in full</p> : null}
    {booking.status === "CONFIRMED" ? <ReschedulePanel key={`${booking.id}:${booking.updatedAt}`} booking={booking} saving={saving} onReschedule={reschedule} /> : null}
    {error ? <p className="mt-4 text-sm font-semibold text-red-700">{error}</p> : null}
    {booking.status === "CONFIRMED" ? <button type="button" disabled={saving} onClick={cancel} className="mt-5 min-h-11 w-full border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-700">Cancel and release slots</button> : null}
    {booking.refundRequired ? <p className="mt-3 text-xs leading-relaxed text-[#9a641c]">Online payment was received. Complete any refund through the payment provider.</p> : null}
  </div>;
}

function ReschedulePanel({ booking, saving, onReschedule }: { booking: ManagerBooking; saving: boolean; onReschedule: (slots: string[]) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(booking.date < dateKey(new Date()) ? dateKey(new Date()) : booking.date);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setSelected([]);
    setLocalError("");
    managerApi<AvailabilityResponse>(`/api/manager/availability?fieldId=${booking.fieldId}&from=${date}&to=${date}`)
      .then((data) => { if (active) setAvailability(data); })
      .catch((requestError) => { if (active) setLocalError(requestError instanceof Error ? requestError.message : "Unable to load slots."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [booking.fieldId, date, open]);

  const slots = availability?.days[0]?.slots ?? [];

  function chooseStart(index: number) {
    const next = slots.slice(index, index + booking.slots.length);
    const consecutive = next.length === booking.slots.length && next.every((slot, offset) => slot.status === "AVAILABLE" && (!offset || new Date(slot.startAt).getTime() - new Date(next[offset - 1].startAt).getTime() === 60 * 60_000));
    if (!consecutive) {
      setSelected([]);
      setLocalError(`Choose a run of ${booking.slots.length} open ${booking.slots.length === 1 ? "hour" : "hours"}.`);
      return;
    }
    setLocalError("");
    setSelected(next.map((slot) => slot.startAt));
  }

  async function submit() {
    if (selected.length !== booking.slots.length) return;
    try {
      await onReschedule(selected);
      setOpen(false);
    } catch {
      // The parent surfaces the API error alongside the booking actions.
    }
  }

  return <section className="mt-5 border-t border-line pt-5">
    <button type="button" onClick={() => setOpen((value) => !value)} className="flex min-h-11 w-full items-center justify-between border border-line bg-white px-3 text-sm font-bold"><span className="flex items-center gap-2"><CalendarRange className="h-4 w-4 text-olive" /> Reschedule booking</span><ChevronRight className={`h-4 w-4 transition ${open ? "rotate-90" : ""}`} /></button>
    {open ? <div className="mt-3"><label className="grid gap-1 text-xs font-bold text-muted">New date<input type="date" min={dateKey(new Date())} value={date} onChange={(event) => setDate(event.target.value)} className="min-h-11 border border-line bg-white px-3 text-sm font-semibold text-ink outline-none focus:border-olive" /></label>
      <p className="mt-3 text-[10px] font-extrabold uppercase tracking-[0.1em] text-muted">Choose the first of {booking.slots.length} consecutive {booking.slots.length === 1 ? "hour" : "hours"}</p>
      {loading ? <div className="grid min-h-24 place-items-center"><LoaderCircle className="h-5 w-5 animate-spin text-olive" /></div> : <div className="mt-2 grid grid-cols-3 gap-2">{slots.map((slot, index) => <button key={slot.startAt} type="button" disabled={slot.status !== "AVAILABLE"} onClick={() => chooseStart(index)} className={`min-h-11 border px-2 text-xs font-bold ${selected.includes(slot.startAt) ? "border-olive bg-olive text-white" : slot.status === "AVAILABLE" ? "border-line bg-white hover:border-olive" : "border-line bg-[#f2f0ec] text-muted opacity-55"}`}>{slot.label}</button>)}</div>}
      {!loading && !slots.length ? <p className="mt-3 text-sm text-muted">No operating slots on this date.</p> : null}
      {localError ? <p className="mt-3 text-xs font-semibold text-red-700">{localError}</p> : null}
      <button type="button" disabled={saving || selected.length !== booking.slots.length} onClick={() => void submit()} className="mt-3 min-h-11 w-full border border-olive bg-olive px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">Confirm new time</button>
    </div> : null}
  </section>;
}
