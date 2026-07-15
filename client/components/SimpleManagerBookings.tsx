"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Banknote, CalendarClock, Check, ChevronRight, Phone, Search, X } from "lucide-react";
import { useManagerOnline } from "@/components/ManagerConnectivity";
import { managerApi, type AvailabilityResponse, type ManagerBooking } from "@/lib/manager-api";
import { dateKey } from "@/lib/manager-api";
import { formatManagerTaka, managerErrorText } from "@/lib/manager-ui";

export function SimpleManagerBookings() {
  const searchParams = useSearchParams();
  const online = useManagerOnline();
  const [query, setQuery] = useState(searchParams.get("query") ?? "");
  const [submitted, setSubmitted] = useState(searchParams.get("query") ?? "");
  const [bookings, setBookings] = useState<ManagerBooking[]>([]);
  const [selected, setSelected] = useState<ManagerBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [method, setMethod] = useState("Cash");
  const [partial, setPartial] = useState("");
  const [showPartial, setShowPartial] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const load = useCallback(async (nextQuery = submitted) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (nextQuery.trim()) params.set("query", nextQuery.trim());
      const data = await managerApi<{ bookings: ManagerBooking[] }>(`/api/manager/bookings?${params}`);
      setBookings(data.bookings);
      setSelected((current) => current ? data.bookings.find((item) => item.id === current.id) ?? current : null);
    } catch (requestError) { setError(managerErrorText(requestError)); } finally { setLoading(false); }
  }, [submitted]);
  useEffect(() => { void load(); }, [load]);

  async function collect(amount: number) {
    if (!selected || !online || amount < 1) return;
    setSaving(true);
    setError("");
    try {
      const data = await managerApi<{ booking: ManagerBooking }>(`/api/manager/bookings/${selected.id}/payments`, { method: "POST", body: JSON.stringify({ amountBdt: amount, method }) });
      setSelected(data.booking);
      setBookings((current) => current.map((item) => item.id === data.booking.id ? data.booking : item));
      setShowPartial(false);
      setPartial("");
    } catch (requestError) { setError(managerErrorText(requestError)); } finally { setSaving(false); }
  }

  async function cancel() {
    if (!selected || !online) return;
    setSaving(true);
    try {
      const data = await managerApi<{ booking: ManagerBooking }>(`/api/manager/bookings/${selected.id}/cancel`, { method: "POST" });
      setSelected(data.booking);
      setBookings((current) => current.map((item) => item.id === data.booking.id ? data.booking : item));
      setConfirmCancel(false);
    } catch (requestError) { setError(managerErrorText(requestError)); } finally { setSaving(false); }
  }

  async function reschedule(slotStartAts: string[]) {
    if (!selected || !online) return;
    setSaving(true);
    try {
      const data = await managerApi<{ booking: ManagerBooking }>(`/api/manager/bookings/${selected.id}/reschedule`, { method: "POST", body: JSON.stringify({ slotStartAts }) });
      setSelected(data.booking);
      setBookings((current) => current.map((item) => item.id === data.booking.id ? data.booking : item));
      setShowMore(false);
    } catch (requestError) { setError(managerErrorText(requestError)); throw requestError; } finally { setSaving(false); }
  }

  return (
    <main className="mx-auto max-w-[900px] px-4 py-5 pb-28 sm:px-6 md:py-8">
      <h1 className="text-3xl font-extrabold">বুকিং</h1>
      <form onSubmit={(event) => { event.preventDefault(); setSubmitted(query.trim()); }} className="mt-5 grid grid-cols-[minmax(0,1fr)_60px]">
        <label className="relative"><span className="sr-only">Search</span><Search className="absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-muted" /><input inputMode="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ফোন অথবা ইনভয়েস" className="min-h-16 w-full border-2 border-line bg-white pl-12 pr-3 text-lg font-bold outline-none focus:border-olive" /></label>
        <button aria-label="Search" className="grid min-h-16 place-items-center border border-olive bg-olive text-white"><Search className="h-7 w-7" /></button>
      </form>
      {error && !selected ? <p role="alert" className="mt-3 border border-red-200 bg-red-50 p-4 font-extrabold text-red-700">{error}</p> : null}
      <section className="mt-4 grid gap-2">
        {loading ? <div className="grid min-h-52 place-items-center font-bold text-muted">Loading...</div> : null}
        {!loading && !bookings.length ? <div className="grid min-h-60 place-items-center border border-line bg-white text-center"><div><CalendarClock className="mx-auto h-12 w-12 text-muted" /><strong className="mt-3 block text-xl">বুকিং পাওয়া যায়নি</strong></div></div> : null}
        {bookings.map((booking) => {
          const due = booking.status === "CONFIRMED" && booking.balanceAmountBdt > 0;
          return <button key={booking.id} type="button" onClick={() => { setSelected(booking); setError(""); setShowPartial(false); setShowMore(false); setConfirmCancel(false); }} className={`manager-action-press grid min-h-[92px] grid-cols-[54px_minmax(0,1fr)_auto] items-center gap-3 border p-3 text-left ${due ? "border-[#dda26e] bg-[#fff0e2]" : booking.status === "CONFIRMED" ? "border-[#9aaaf5] bg-[#e9edff]" : "border-line bg-white"}`}><span className="grid h-12 w-12 place-items-center rounded-full bg-white/80">{due ? <Banknote className="h-7 w-7 text-[#713d16]" /> : <Check className="h-7 w-7 text-[#263786]" />}</span><span className="min-w-0"><strong className="block truncate text-lg">{booking.customerName || booking.customerPhone}</strong><span className="mt-1 block truncate text-sm font-bold text-muted">{booking.fieldName} · {booking.date}</span><span className="block truncate text-xs font-bold text-muted">{booking.slotRange}</span></span><span className="text-right">{due ? <><small className="block font-bold">বাকি</small><strong className="text-xl">{formatManagerTaka(booking.balanceAmountBdt)}</strong></> : <strong className="text-sm">{booking.status === "CONFIRMED" ? "পরিশোধ" : booking.status}</strong>}<ChevronRight className="ml-auto mt-2 h-5 w-5" /></span></button>;
        })}
      </section>

      {selected ? <div className="fixed inset-0 z-[80] bg-ink/35"><button type="button" aria-label="Close" onClick={() => setSelected(null)} className="absolute inset-0 h-full w-full" /><section className="absolute inset-x-0 bottom-0 max-h-[94dvh] overflow-y-auto border-t border-line bg-[#fffefd] p-4 pb-[calc(22px+env(safe-area-inset-bottom))] md:inset-y-5 md:left-auto md:right-5 md:w-[460px] md:border md:p-6"><header className="flex items-center justify-between border-b border-line pb-4"><div><p className="text-xs font-bold text-muted">{selected.invoiceNumber}</p><h2 className="mt-1 text-2xl font-extrabold">{selected.customerName || selected.customerPhone}</h2></div><button type="button" onClick={() => setSelected(null)} aria-label="Close" className="grid h-12 w-12 place-items-center border border-line bg-white"><X className="h-6 w-6" /></button></header><dl className="mt-4 grid gap-px bg-line"><Row label="মাঠ" value={selected.fieldName} /><Row label="সময়" value={`${selected.date} · ${selected.slotRange}`} /><Row label="ফোন" value={selected.customerPhone} /><Row label="মোট" value={formatManagerTaka(selected.totalAmountBdt)} /><Row label="বাকি" value={formatManagerTaka(selected.balanceAmountBdt)} /></dl><a href={`tel:${selected.customerPhone}`} className="manager-action-press mt-4 inline-flex min-h-14 w-full items-center justify-center gap-2 border border-line bg-white text-base font-extrabold"><Phone className="h-6 w-6" /> কল করুন</a>{selected.status === "CONFIRMED" && selected.balanceAmountBdt > 0 ? <><button type="button" disabled={!online || saving} onClick={() => void collect(selected.balanceAmountBdt)} className="manager-action-press mt-2 min-h-14 w-full border border-[#c77732] bg-[#e7822c] text-base font-extrabold text-white"><Banknote className="mr-2 inline h-6 w-6" /> সব টাকা নিন</button><button type="button" onClick={() => setShowPartial((value) => !value)} className="mt-2 min-h-[52px] w-full font-extrabold text-muted">অল্প টাকা / মাধ্যম</button>{showPartial ? <div className="grid gap-2 border border-line bg-panel p-3"><input type="number" min="1" max={selected.balanceAmountBdt} value={partial} onChange={(event) => setPartial(event.target.value)} placeholder="৳ কত" className="min-h-14 border border-line bg-white px-4 text-xl font-extrabold" /><div className="grid grid-cols-4 gap-1">{["Cash", "bKash", "Nagad", "Other"].map((value) => <button key={value} type="button" onClick={() => setMethod(value)} className={`min-h-[52px] border text-xs font-extrabold ${method === value ? "border-olive bg-olive text-white" : "border-line bg-white"}`}>{value}</button>)}</div><button type="button" disabled={!online || Number(partial) < 1} onClick={() => void collect(Number(partial))} className="min-h-14 bg-ink font-extrabold text-white">নিশ্চিত করুন</button></div> : null}</> : selected.balanceAmountBdt === 0 ? <p className="mt-3 flex min-h-14 items-center gap-2 border border-[#a9cdb8] bg-[#edf8f1] px-4 font-extrabold text-[#194f35]"><Check className="h-6 w-6" /> পুরো টাকা হয়েছে</p> : null}{selected.status === "CONFIRMED" ? <><button type="button" onClick={() => setShowMore((value) => !value)} className="mt-3 min-h-[52px] w-full border border-line bg-white font-extrabold">আরও</button>{showMore ? <div className="mt-2 grid gap-2 border border-line bg-panel p-3"><SimpleReschedule booking={selected} saving={saving} onReschedule={reschedule} />{confirmCancel ? <div className="border border-red-200 bg-red-50 p-3"><strong className="block text-red-800">{selected.customerPhone}</strong><span className="mt-1 block text-sm text-red-700">{selected.date} · {selected.slotRange}</span><button type="button" disabled={!online || saving} onClick={() => void cancel()} className="mt-3 min-h-[52px] w-full bg-red-700 font-extrabold text-white">বাতিল নিশ্চিত করুন</button></div> : <button type="button" onClick={() => setConfirmCancel(true)} className="min-h-[52px] border border-red-200 bg-white font-extrabold text-red-700">বুকিং বাতিল</button>}</div> : null}</> : null}{error ? <p role="alert" className="mt-3 border border-red-200 bg-red-50 p-3 font-extrabold text-red-700">{error}</p> : null}</section></div> : null}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4 bg-white p-4"><dt className="text-muted">{label}</dt><dd className="text-right font-extrabold">{value}</dd></div>;
}

function SimpleReschedule({ booking, saving, onReschedule }: { booking: ManagerBooking; saving: boolean; onReschedule: (starts: string[]) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(booking.date < dateKey(new Date()) ? dateKey(new Date()) : booking.date);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    setError("");
    managerApi<AvailabilityResponse>(`/api/manager/availability?fieldId=${booking.fieldId}&from=${date}&to=${date}`).then(setAvailability).catch((requestError) => setError(managerErrorText(requestError)));
  }, [booking.fieldId, date, open]);
  const slots = availability?.days[0]?.slots.filter((slot) => slot.status === "AVAILABLE") ?? [];
  function choose(index: number) {
    const all = availability?.days[0]?.slots ?? [];
    const chosen = all.slice(index, index + booking.slots.length);
    if (chosen.length !== booking.slots.length || chosen.some((slot) => slot.status !== "AVAILABLE")) { setError("খালি সময় বেছে নিন"); setSelected([]); return; }
    setError("");
    setSelected(chosen.map((slot) => slot.startAt));
  }
  return <div><button type="button" onClick={() => setOpen((value) => !value)} className="min-h-[52px] w-full border border-line bg-white font-extrabold">সময় বদলান</button>{open ? <div className="mt-2"><input type="date" min={dateKey(new Date())} value={date} onChange={(event) => setDate(event.target.value)} className="min-h-14 w-full border border-line bg-white px-3 font-extrabold" /><div className="mt-2 grid grid-cols-3 gap-2">{slots.map((slot) => { const index = availability?.days[0]?.slots.findIndex((item) => item.startAt === slot.startAt) ?? -1; return <button key={slot.startAt} type="button" onClick={() => choose(index)} className={`min-h-[52px] border font-extrabold ${selected.includes(slot.startAt) ? "border-olive bg-olive text-white" : "border-line bg-white"}`}>{slot.label}</button>; })}</div>{error ? <p className="mt-2 font-bold text-red-700">{error}</p> : null}<button type="button" disabled={saving || selected.length !== booking.slots.length} onClick={() => void onReschedule(selected)} className="mt-2 min-h-14 w-full bg-ink font-extrabold text-white disabled:opacity-40">নিশ্চিত করুন</button></div> : null}</div>;
}
