"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { apiBaseUrl, type PublicField } from "@/lib/api";
import type { AvailabilityResponse, AvailabilitySlot } from "@/lib/manager-api";

type BookingField = Pick<PublicField, "id" | "name" | "hourlyRate" | "openingHours">;

type PaymentResponse = {
  booking: { slotRange: string; totalAmountBdt: number; paymentMode: "advance" | "full" };
  payment: { invoiceNumber: string; payableAmountBdt: number; paymentUrl: string; supportedPaymentMethods: string[]; mock: boolean };
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 0 }).format(value);
}

function dateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function addDays(value: string, amount: number) {
  const date = new Date(`${value}T12:00:00+06:00`);
  date.setUTCDate(date.getUTCDate() + amount);
  return dateKey(date);
}

function dateMeta(value: string, today: string) {
  const date = new Date(`${value}T12:00:00+06:00`);
  return {
    weekday: value === today ? "Today" : new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dhaka", weekday: "short" }).format(date),
    date: new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dhaka", day: "numeric" }).format(date),
    month: new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dhaka", month: "short" }).format(date),
  };
}

export function TurfBookingClient({ turf }: { turf: BookingField }) {
  const today = useMemo(() => dateKey(new Date()), []);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedStarts, setSelectedStarts] = useState<string[]>([]);
  const [mobileStep, setMobileStep] = useState<"date" | "slots" | "payment">("date");
  const [paymentMode, setPaymentMode] = useState<"advance" | "full">("advance");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`${apiBaseUrl}/api/fields/${encodeURIComponent(turf.id)}/availability?from=${today}&to=${addDays(today, 6)}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message ?? "Unable to load availability.");
        setAvailability(data as AvailabilityResponse);
      })
      .catch((error) => { if (error instanceof Error && error.name !== "AbortError") setPaymentError(error.message); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [today, turf.id]);

  const selectedDay = availability?.days.find((day) => day.date === selectedDate) ?? availability?.days[0];
  const selectedDayMeta = dateMeta(selectedDay?.date ?? selectedDate, today);
  const availableSlots = selectedDay?.slots.filter((slot) => slot.status === "AVAILABLE") ?? [];
  const selectedSlots = useMemo(() => selectedDay?.slots.filter((slot) => selectedStarts.includes(slot.startAt)) ?? [], [selectedDay, selectedStarts]);
  const total = selectedSlots.reduce((sum, slot) => sum + slot.priceBdt, 0);
  const payableAmount = paymentMode === "advance" ? Math.ceil(total * 0.1) : total;
  const selectedRange = selectedSlots.length ? `${selectedSlots[0].label} - ${new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dhaka", hour: "numeric", minute: "2-digit" }).format(new Date(selectedSlots[selectedSlots.length - 1].endAt))}` : "";

  function selectDay(date: string) {
    setSelectedDate(date);
    setSelectedStarts([]);
    setPaymentError("");
    setMobileStep("slots");
  }

  function selectSlot(slot: AvailabilitySlot) {
    if (slot.status !== "AVAILABLE") return;
    const slots = selectedDay?.slots ?? [];
    const targetIndex = slots.findIndex((item) => item.startAt === slot.startAt);
    setSelectedStarts((current) => {
      if (current.includes(slot.startAt)) {
        if (current.length === 1) return [];
        const indexes = current.map((start) => slots.findIndex((item) => item.startAt === start)).sort((a, b) => a - b);
        return targetIndex === indexes[0] || targetIndex === indexes[indexes.length - 1] ? current.filter((start) => start !== slot.startAt) : [slot.startAt];
      }
      if (!current.length) return [slot.startAt];
      const indexes = [...current.map((start) => slots.findIndex((item) => item.startAt === start)), targetIndex];
      const range = slots.slice(Math.min(...indexes), Math.max(...indexes) + 1);
      return range.every((item) => item.status === "AVAILABLE") ? range.map((item) => item.startAt) : [slot.startAt];
    });
    setMobileStep("payment");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedStarts.length || !email.trim() || !phone.trim()) return;
    setSubmitting(true);
    setPaymentError("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/bookings/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldId: turf.id, slotStartAts: selectedStarts, paymentMode, customerEmail: email.trim(), customerPhone: phone.trim() }),
      });
      const data = (await response.json()) as PaymentResponse | { message?: string };
      if (!response.ok || !("payment" in data)) throw new Error("message" in data && data.message ? data.message : "Unable to start payment.");
      window.location.assign(data.payment.paymentUrl);
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : "Unable to start payment.");
    } finally { setSubmitting(false); }
  }

  return (
    <>
      <a href="#booking" aria-label="Jump to booking" className="fixed bottom-5 right-5 z-40 grid h-12 w-12 place-items-center rounded-full border border-line bg-[#fffefd]/95 text-ink shadow-[0_16px_38px_rgba(23,22,19,0.18)] backdrop-blur-md transition hover:-translate-y-1 md:hidden"><Icon name="arrow-down" className="h-5 w-5 animate-bounce" /></a>
      <aside id="booking" className="w-full min-w-0 scroll-mt-[112px] lg:sticky lg:top-[104px] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
        <div className="w-full min-w-0 overflow-hidden border border-line bg-[#fffefd]/95 p-5 shadow-[0_24px_70px_rgba(23,22,19,0.08)] md:p-7 lg:max-w-[420px]">
          <header className="flex items-start justify-between gap-6 border-b border-line pb-5"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted">Live availability</p><h2 className="mt-2 font-serif text-[30px] font-normal leading-none">Book this field</h2></div><div className="text-right"><strong className="font-serif text-[26px] font-normal leading-none">{formatMoney(turf.hourlyRate)}</strong><span className="block text-xs text-muted">from / hour</span></div></header>
          <form className="mt-6 grid min-w-0 gap-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-3 gap-1 bg-panel p-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-muted md:hidden">
              {["Date", "Slot", "Pay"].map((label, index) => {
                const active = (mobileStep === "date" && index === 0) || (mobileStep === "slots" && index === 1) || (mobileStep === "payment" && index === 2);
                return <span key={label} className={`grid min-h-8 place-items-center ${active ? "bg-white text-ink shadow-sm" : ""}`}>{label}</span>;
              })}
            </div>
            <fieldset className={`min-w-0 ${mobileStep !== "date" ? "hidden md:block" : ""}`}><legend className="flex w-full items-center justify-between gap-3 text-sm font-bold"><span>Select a date</span><span className="hidden font-normal text-muted md:inline">Next 7 days</span></legend><div className="scrollbar-none -mx-1 mt-3 flex w-full max-w-full gap-2 overflow-x-auto px-1 pb-1">{(availability?.days ?? Array.from({ length: 7 }, (_, index) => ({ date: addDays(today, index), slots: [] }))).map((day) => { const meta = dateMeta(day.date, today); const active = day.date === selectedDate; return <button key={day.date} type="button" aria-pressed={active} onClick={() => selectDay(day.date)} className={`grid min-h-[68px] min-w-[64px] shrink-0 place-items-center border px-2 text-center ${active ? "border-olive bg-olive text-white" : "border-line bg-white text-ink hover:border-[#aba397]"}`}><span className="text-[10px] font-bold uppercase">{meta.weekday}</span><span className="font-serif text-xl leading-none">{meta.date}</span><span className={`text-[10px] ${active ? "text-white/75" : "text-muted"}`}>{meta.month}</span></button>; })}</div></fieldset>
            <fieldset id="slot-selection" className={`min-w-0 scroll-mt-[92px] ${mobileStep !== "slots" ? "hidden md:block" : ""}`}><legend className="grid gap-3 text-sm font-bold md:flex md:w-full md:items-center md:justify-between"><span>{selectedDayMeta.weekday}, {selectedDayMeta.date} {selectedDayMeta.month}</span><span className="font-normal text-muted md:hidden">{availableSlots.length} available</span><span className="hidden font-normal text-muted md:inline">{turf.openingHours}</span></legend><button type="button" onClick={() => setMobileStep("date")} className="mt-3 inline-flex min-h-10 items-center gap-2 border border-line bg-white px-3 text-xs font-bold md:hidden"><Icon name="arrow-left" className="h-3.5 w-3.5" />Back to dates</button><div className="mt-3 grid min-w-0 grid-cols-1 gap-2 md:grid-cols-2">{loading ? <p className="col-span-full py-6 text-center text-sm text-muted">Loading live slots...</p> : null}{!loading && selectedDay?.slots.length === 0 ? <p className="col-span-full border border-line bg-panel p-4 text-center text-sm text-muted">No slots are open on this date.</p> : null}{!loading && selectedDay?.slots.length !== 0 && availableSlots.length === 0 ? <p className="col-span-full border border-line bg-panel p-4 text-center text-sm text-muted md:hidden">No available slots remain for this date.</p> : null}{selectedDay?.slots.map((slot) => { const unavailable = slot.status !== "AVAILABLE"; const selected = selectedStarts.includes(slot.startAt); return <button key={slot.startAt} type="button" disabled={unavailable} aria-pressed={selected} onClick={() => selectSlot(slot)} className={`min-h-[58px] min-w-0 border px-3 py-2 text-left transition ${unavailable || selected ? "hidden md:block" : ""} ${selected ? "border-olive bg-[#eef0ff] text-olive-dark" : unavailable ? "cursor-not-allowed border-line/70 bg-panel/50 text-muted/55" : "border-line bg-white hover:border-olive/55 hover:bg-[#f7f7ff]"}`}><span className="block text-xs font-bold">{slot.label}</span><span className="mt-1 block text-[10px]">{unavailable ? "Unavailable" : selected ? "Selected" : `${formatMoney(slot.priceBdt)}/hr`}</span></button>; })}</div><p className="mt-3 text-xs leading-relaxed text-muted">Select one hour, or extend into adjacent open hours for longer games.</p></fieldset>
            <div className={`min-w-0 gap-6 ${mobileStep !== "payment" ? "hidden md:grid" : "grid"}`}>
              <div className="border border-line bg-panel/70 p-3 md:hidden">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-[10px] font-extrabold uppercase tracking-[0.11em] text-muted">Selected slot</p><p className="mt-1 text-sm font-bold">{selectedSlots.length ? `${selectedRange} (${selectedSlots.length} hr)` : "No slot selected"}</p></div>
                  <button type="button" onClick={() => setMobileStep("slots")} className="min-h-9 shrink-0 border border-line bg-white px-3 text-xs font-bold">Add or change</button>
                </div>
              </div>
              <fieldset className="min-w-0"><legend className="text-sm font-bold">Payment amount</legend><div className="mt-3 grid grid-cols-1 border border-line bg-panel/60 p-1 md:grid-cols-2">{[{ value: "advance" as const, label: "10% advance", amount: Math.ceil(total * 0.1) }, { value: "full" as const, label: "Full amount", amount: total }].map((option) => <button key={option.value} type="button" aria-pressed={paymentMode === option.value} onClick={() => setPaymentMode(option.value)} className={`min-h-[58px] px-3 text-left text-sm font-bold ${paymentMode === option.value ? "bg-white text-ink shadow-sm" : "text-muted"}`}><span className="block">{option.label}</span><span className="mt-1 block text-[11px] font-normal">{total ? formatMoney(option.amount) : "Select slots first"}</span></button>)}</div></fieldset>
              <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-bold">Confirmation email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="min-h-11 border border-line bg-white px-3 font-normal outline-none focus:border-olive" /></label><label className="grid gap-2 text-sm font-bold">Phone number<input required type="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="01XXXXXXXXX" className="min-h-11 border border-line bg-white px-3 font-normal outline-none focus:border-olive" /></label></div>
              <div className="border-y border-line py-4"><div className="flex items-center justify-between gap-4 text-sm"><span className="text-muted">{selectedSlots.length ? `${selectedRange} (${selectedSlots.length} hr)` : "Choose open one-hour slots"}</span><strong className="whitespace-nowrap font-serif text-2xl font-normal">{selectedSlots.length ? formatMoney(payableAmount) : "-"}</strong></div><p className="mt-2 text-xs leading-relaxed text-muted">{selectedSlots.length ? `Total ${formatMoney(total)}. ${paymentMode === "advance" ? "10% advance confirms the booking." : "Paying full amount completes the booking now."}` : "Select slots to calculate the confirmation payment."}</p></div>
              {paymentError ? <p role="alert" className="border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{paymentError}</p> : null}
              <button type="submit" disabled={submitting || !selectedStarts.length || !email.trim() || !phone.trim()} className="inline-flex min-h-12 items-center justify-center gap-2 border border-olive bg-olive px-6 text-sm font-bold text-white transition hover:bg-olive-dark disabled:cursor-not-allowed disabled:opacity-45">{submitting ? "Preparing payment..." : "Confirm with payment"}<Icon name="arrow-right" className="h-4 w-4" /></button>
            </div>
          </form>
        </div>
      </aside>
    </>
  );
}
