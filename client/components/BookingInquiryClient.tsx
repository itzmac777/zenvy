"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { apiBaseUrl, formatBdt, type PublicBooking } from "@/lib/api";

export function BookingInquiryClient() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicBooking[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/bookings/search?query=${encodeURIComponent(trimmedQuery)}`);
      const data = (await response.json()) as { results?: PublicBooking[]; message?: string };

      if (!response.ok) throw new Error(data.message ?? "Unable to search bookings.");

      setResults(data.results ?? []);
      setMessage(data.results?.length ? "" : "No booking found for that invoice or contact number.");
    } catch (error) {
      setResults([]);
      setMessage(error instanceof Error ? error.message : "Unable to search bookings.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="w-full border border-line bg-[#fffefd] p-6 shadow-[0_24px_70px_rgba(23,22,19,0.08)] md:p-10">
      <div className="max-w-[660px]">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted">Booking inquiry</p>
        <h1 className="mt-3 font-serif text-[42px] font-normal leading-none md:text-[56px]">Find your turf booking.</h1>
        <p className="mt-5 text-sm leading-relaxed text-muted">
          Search using your invoice ID or the contact number used during booking.
        </p>
      </div>

      <form className="mt-8 grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="booking-query">
          Invoice ID or contact number
        </label>
        <input
          id="booking-query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Invoice ID or contact number"
          className="min-h-12 w-full border border-line bg-white px-4 text-sm outline-none transition placeholder:text-muted/65 focus:border-olive"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="inline-flex min-h-12 items-center justify-center border border-olive bg-olive px-7 text-sm font-bold text-white transition hover:bg-olive-dark disabled:cursor-not-allowed disabled:border-[#b8b5ad] disabled:bg-[#b8b5ad]"
        >
          {loading ? "Searching..." : "Find booking"}
        </button>
      </form>

      {message ? <p className="mt-5 border border-line bg-panel/60 px-4 py-3 text-sm font-semibold text-muted">{message}</p> : null}

      {results.length > 0 ? (
        <div className="mt-8 grid gap-4">
          {results.map((booking) => (
            <article key={booking.invoiceNumber} className="border border-line bg-white p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted">{booking.invoiceNumber}</p>
                  <h2 className="mt-2 font-serif text-3xl font-normal leading-none">{booking.turfName}</h2>
                  <p className="mt-3 text-sm font-semibold">{booking.date}, {booking.slotRange}</p>
                  <p className="mt-2 text-sm text-muted">Contact: {booking.customerPhone}</p>
                </div>
                <div className="border border-line bg-panel/60 px-4 py-3 text-sm md:text-right">
                  <span className="block text-muted">{booking.paymentMode === "advance" ? "Advance paid" : "Paid"}</span>
                  <strong className="mt-1 block text-lg">{formatBdt(booking.payableAmountBdt)}</strong>
                  <span className="mt-2 block text-xs uppercase tracking-[0.12em] text-muted">{booking.paymentStatus}</span>
                </div>
              </div>
              <Link href={`/booking/success?invoice=${encodeURIComponent(booking.invoiceNumber)}&status=${encodeURIComponent(booking.paymentStatus)}`} className="mt-5 inline-flex min-h-10 items-center justify-center border border-line bg-white px-4 text-xs font-bold transition hover:border-olive/50">
                View details
              </Link>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
