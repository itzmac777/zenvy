"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { BdtAmount } from "@/components/BdtAmount";
import { Icon } from "@/components/Icon";
import { apiBaseUrl, type PublicField } from "@/lib/api";
import type { AvailabilityResponse, AvailabilitySlot } from "@/lib/manager-api";

type BookingField = Pick<PublicField, "id" | "name" | "hourlyRate" | "openingHours">;
type MobileStage = "select" | "checkout";

type PaymentResponse = {
  booking: { slotRange: string; totalAmountBdt: number; paymentMode: "advance" | "full" };
  payment: {
    invoiceNumber: string;
    payableAmountBdt: number;
    paymentUrl: string;
    supportedPaymentMethods: string[];
    mock: boolean;
  };
};

function dateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addDays(value: string, amount: number) {
  const date = new Date(`${value}T12:00:00+06:00`);
  date.setUTCDate(date.getUTCDate() + amount);
  return dateKey(date);
}

function dateMeta(value: string, today: string) {
  const date = new Date(`${value}T12:00:00+06:00`);
  return {
    weekday: value === today
      ? "Today"
      : new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dhaka", weekday: "short" }).format(date),
    date: new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dhaka", day: "numeric" }).format(date),
    month: new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dhaka", month: "short" }).format(date),
  };
}

export function TurfBookingClient({ turf }: { turf: BookingField }) {
  const today = useMemo(() => dateKey(new Date()), []);
  const bookingRef = useRef<HTMLElement>(null);
  const slotSelectionRef = useRef<HTMLFieldSetElement>(null);
  const checkoutRef = useRef<HTMLDivElement>(null);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedStarts, setSelectedStarts] = useState<string[]>([]);
  const [mobileStage, setMobileStage] = useState<MobileStage>("select");
  const [bookingInView, setBookingInView] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"advance" | "full">("advance");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`${apiBaseUrl}/api/fields/${encodeURIComponent(turf.id)}/availability?from=${today}&to=${addDays(today, 6)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message ?? "Unable to load availability.");
        setAvailability(data as AvailabilityResponse);
      })
      .catch((error) => {
        if (error instanceof Error && error.name !== "AbortError") setPaymentError(error.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [today, turf.id]);

  useEffect(() => {
    const booking = bookingRef.current;
    if (!booking) return;
    const observer = new IntersectionObserver(([entry]) => setBookingInView(entry.isIntersecting), {
      threshold: 0.08,
    });
    observer.observe(booking);
    return () => observer.disconnect();
  }, []);

  const selectedDay = availability?.days.find((day) => day.date === selectedDate) ?? availability?.days[0];
  const selectedDayMeta = dateMeta(selectedDay?.date ?? selectedDate, today);
  const availableSlots = selectedDay?.slots.filter((slot) => slot.status === "AVAILABLE") ?? [];
  const selectedSlots = useMemo(
    () => selectedDay?.slots.filter((slot) => selectedStarts.includes(slot.startAt)) ?? [],
    [selectedDay, selectedStarts],
  );
  const total = selectedSlots.reduce((sum, slot) => sum + slot.priceBdt, 0);
  const payableAmount = paymentMode === "advance" ? Math.ceil(total * 0.1) : total;
  const selectedRange = selectedSlots.length
    ? `${selectedSlots[0].label} - ${new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Dhaka",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(selectedSlots[selectedSlots.length - 1].endAt))}`
    : "";
  const selectedHoursLabel = `${selectedSlots.length} hour${selectedSlots.length === 1 ? "" : "s"}`;

  function selectDay(date: string) {
    setSelectedDate(date);
    setSelectedStarts([]);
    setPaymentError("");
  }

  function selectSlot(slot: AvailabilitySlot) {
    if (slot.status !== "AVAILABLE") return;
    const slots = selectedDay?.slots ?? [];
    const targetIndex = slots.findIndex((item) => item.startAt === slot.startAt);

    setSelectedStarts((current) => {
      if (current.includes(slot.startAt)) {
        if (current.length === 1) return [];
        const indexes = current
          .map((start) => slots.findIndex((item) => item.startAt === start))
          .sort((a, b) => a - b);
        if (targetIndex === indexes[0] || targetIndex === indexes[indexes.length - 1]) {
          return current.filter((start) => start !== slot.startAt);
        }
        return [slot.startAt];
      }

      if (!current.length) return [slot.startAt];
      const indexes = [
        ...current.map((start) => slots.findIndex((item) => item.startAt === start)),
        targetIndex,
      ];
      const range = slots.slice(Math.min(...indexes), Math.max(...indexes) + 1);
      return range.every((item) => item.status === "AVAILABLE")
        ? range.map((item) => item.startAt)
        : [slot.startAt];
    });
    setPaymentError("");
  }

  function continueToCheckout() {
    if (!selectedStarts.length) return;
    setMobileStage("checkout");
    requestAnimationFrame(() => checkoutRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function editTime() {
    setMobileStage("select");
    requestAnimationFrame(() => slotSelectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
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
        body: JSON.stringify({
          fieldId: turf.id,
          slotStartAts: selectedStarts,
          paymentMode,
          customerEmail: email.trim(),
          customerPhone: phone.trim(),
        }),
      });
      const data = (await response.json()) as PaymentResponse | { message?: string };
      if (!response.ok || !("payment" in data)) {
        throw new Error("message" in data && data.message ? data.message : "Unable to start payment.");
      }
      window.location.assign(data.payment.paymentUrl);
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : "Unable to start payment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {!bookingInView ? (
        <a
          href="#booking"
          aria-label="Jump to booking"
          className="fixed bottom-5 right-5 z-40 grid h-12 w-12 place-items-center rounded-full border border-line bg-[#fffefd]/95 text-ink shadow-[0_16px_38px_rgba(23,22,19,0.18)] backdrop-blur-md transition hover:-translate-y-1 md:hidden"
        >
          <Icon name="arrow-down" className="h-5 w-5 animate-bounce" />
        </a>
      ) : null}

      <aside
        ref={bookingRef}
        id="booking"
        className="w-full min-w-0 scroll-mt-[112px] lg:sticky lg:top-[104px] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start"
      >
        <div className="w-full min-w-0 overflow-hidden border border-line bg-[#fffefd]/95 p-5 shadow-[0_24px_70px_rgba(23,22,19,0.08)] md:p-7 lg:max-w-[420px]">
          <header className="flex items-start justify-between gap-5 border-b border-line pb-5">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted">Live availability</p>
              <h2 className="mt-2 font-serif text-[30px] font-normal leading-none">Book this field</h2>
            </div>
            <div className="shrink-0 text-right">
              <strong className="text-[24px] leading-none"><BdtAmount value={turf.hourlyRate} /></strong>
              <span className="mt-1 block text-xs text-muted">from / hour</span>
            </div>
          </header>

          <form className="mt-6 grid min-w-0 gap-6" onSubmit={handleSubmit}>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted md:hidden">
              {mobileStage === "select" ? "Choose date and hours" : "Contact and payment"}
            </p>

            <div className={`grid min-w-0 gap-6 ${mobileStage === "checkout" ? "hidden md:grid" : ""}`}>
              <fieldset className="min-w-0">
                <legend className="flex w-full items-center justify-between gap-3 text-sm font-bold">
                  <span>Select a date</span>
                  <span className="font-normal text-muted">Next 7 days</span>
                </legend>
                <div className="scrollbar-none -mx-1 mt-3 flex w-full max-w-full gap-2 overflow-x-auto px-1 pb-1">
                  {(availability?.days ?? Array.from({ length: 7 }, (_, index) => ({ date: addDays(today, index), slots: [] }))).map((day) => {
                    const meta = dateMeta(day.date, today);
                    const active = day.date === selectedDate;
                    return (
                      <button
                        key={day.date}
                        type="button"
                        aria-pressed={active}
                        onClick={() => selectDay(day.date)}
                        className={`grid min-h-[68px] min-w-[62px] shrink-0 place-items-center border px-2 text-center transition ${active ? "border-olive bg-olive text-white" : "border-line bg-white text-ink hover:border-[#aba397]"}`}
                      >
                        <span className="text-[10px] font-bold uppercase">{meta.weekday}</span>
                        <span className="font-serif text-xl leading-none">{meta.date}</span>
                        <span className={`text-[10px] ${active ? "text-white/75" : "text-muted"}`}>{meta.month}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset ref={slotSelectionRef} id="slot-selection" className="min-w-0 scroll-mt-[96px] pb-24 md:pb-0">
                <legend className="flex w-full items-start justify-between gap-3 text-sm font-bold">
                  <span>{selectedDayMeta.weekday}, {selectedDayMeta.date} {selectedDayMeta.month}</span>
                  <span className="shrink-0 font-normal text-muted md:hidden">{availableSlots.length} available</span>
                  <span className="hidden font-normal text-muted md:inline">{turf.openingHours}</span>
                </legend>
                <p className="mt-2 text-xs leading-relaxed text-muted md:hidden">Tap your first and last hour. Every open hour between them will be included.</p>
                <div className="mt-3 grid min-w-0 grid-cols-2 gap-2">
                  {loading ? <p className="col-span-full py-6 text-center text-sm text-muted">Loading live slots...</p> : null}
                  {!loading && selectedDay?.slots.length === 0 ? (
                    <p className="col-span-full border border-line bg-panel p-4 text-center text-sm text-muted">No slots are open on this date.</p>
                  ) : null}
                  {!loading && selectedDay?.slots.length !== 0 && availableSlots.length === 0 ? (
                    <p className="col-span-full border border-line bg-panel p-4 text-center text-sm text-muted md:hidden">No available slots remain for this date.</p>
                  ) : null}
                  {selectedDay?.slots.map((slot) => {
                    const unavailable = slot.status !== "AVAILABLE";
                    const selected = selectedStarts.includes(slot.startAt);
                    return (
                      <button
                        key={slot.startAt}
                        type="button"
                        data-slot-time={slot.time}
                        disabled={unavailable}
                        aria-pressed={selected}
                        onClick={() => selectSlot(slot)}
                        className={`min-h-[62px] min-w-0 border px-3 py-2 text-left transition ${unavailable ? "hidden cursor-not-allowed border-line/70 bg-panel/50 text-muted/55 md:block" : selected ? "border-olive bg-olive text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)]" : "border-line bg-white hover:border-olive/55 hover:bg-[#f7f7ff]"}`}
                      >
                        <span className="flex items-center justify-between gap-2 text-xs font-bold">
                          {slot.label}
                          {selected ? <Icon name="check" className="h-3.5 w-3.5 shrink-0" /> : null}
                        </span>
                        <span className={`mt-1 block text-[10px] ${selected ? "text-white/80" : ""}`}>
                          {unavailable ? "Unavailable" : <BdtAmount value={slot.priceBdt} suffix="/hr" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 hidden text-xs leading-relaxed text-muted md:block">Select one hour, or extend into adjacent open hours for longer games.</p>
              </fieldset>
            </div>

            <div ref={checkoutRef} className={`min-w-0 scroll-mt-[96px] gap-6 ${mobileStage === "checkout" ? "grid" : "hidden md:grid"}`}>
              <div className="flex items-start justify-between gap-4 border-b border-line pb-5 md:hidden">
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.11em] text-muted">Your booking</p>
                  <p className="mt-1 text-sm font-bold">{selectedDayMeta.weekday}, {selectedDayMeta.date} {selectedDayMeta.month}</p>
                  <p className="mt-1 text-xs text-muted">{selectedRange} · {selectedHoursLabel}</p>
                </div>
                <button type="button" onClick={editTime} className="min-h-10 shrink-0 border border-line bg-white px-3 text-xs font-bold">Edit time</button>
              </div>

              <fieldset className="min-w-0">
                <legend className="text-sm font-bold">Payment amount</legend>
                <div className="mt-3 grid grid-cols-2 border border-line bg-panel/60 p-1">
                  {[
                    { value: "advance" as const, label: "10% advance", amount: Math.ceil(total * 0.1) },
                    { value: "full" as const, label: "Full amount", amount: total },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={paymentMode === option.value}
                      onClick={() => setPaymentMode(option.value)}
                      className={`min-h-[62px] px-3 text-left text-sm font-bold ${paymentMode === option.value ? "bg-white text-ink shadow-sm" : "text-muted"}`}
                    >
                      <span className="block">{option.label}</span>
                      <span className="mt-1 block text-[11px] font-normal">{total ? <BdtAmount value={option.amount} /> : "Select slots first"}</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold">
                  Confirmation email
                  <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="min-h-11 border border-line bg-white px-3 font-normal outline-none focus:border-olive" />
                </label>
                <label className="grid gap-2 text-sm font-bold">
                  Phone number
                  <input required type="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="01XXXXXXXXX" className="min-h-11 border border-line bg-white px-3 font-normal outline-none focus:border-olive" />
                </label>
              </div>

              <div className="border-y border-line py-4">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-muted">{selectedSlots.length ? `${selectedRange} (${selectedHoursLabel})` : "Choose open one-hour slots"}</span>
                  <strong className="whitespace-nowrap text-2xl"><BdtAmount value={payableAmount} /></strong>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  {selectedSlots.length ? (
                    <>Total <BdtAmount value={total} />. {paymentMode === "advance" ? "10% advance confirms the booking." : "Paying the full amount completes the booking now."}</>
                  ) : "Select slots to calculate the confirmation payment."}
                </p>
              </div>

              {paymentError ? <p role="alert" className="border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{paymentError}</p> : null}
              <button type="submit" disabled={submitting || !selectedStarts.length || !email.trim() || !phone.trim()} className="inline-flex min-h-12 items-center justify-center gap-2 border border-olive bg-olive px-6 text-sm font-bold text-white transition hover:bg-olive-dark disabled:cursor-not-allowed disabled:opacity-45">
                {submitting ? "Preparing payment..." : "Confirm with payment"}
                <Icon name="arrow-right" className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </aside>

      {bookingInView && mobileStage === "select" ? (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-[#fffefd]/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-16px_40px_rgba(23,22,19,0.12)] backdrop-blur-md md:hidden">
          <div className="mx-auto flex max-w-md items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold">{selectedSlots.length ? selectedRange : "Select your hours"}</p>
              <p className="mt-1 text-[11px] text-muted">
                {selectedSlots.length ? <>{selectedHoursLabel} · <BdtAmount value={total} /></> : "You can select multiple adjacent slots"}
              </p>
            </div>
            <button type="button" disabled={!selectedStarts.length} onClick={continueToCheckout} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 border border-olive bg-olive px-5 text-sm font-bold text-white transition hover:bg-olive-dark disabled:cursor-not-allowed disabled:opacity-40">
              Continue <Icon name="arrow-right" className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
