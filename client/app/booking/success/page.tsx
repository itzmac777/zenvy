import Link from "next/link";
import { Icon } from "@/components/Icon";
import { MarketingHeader } from "@/components/MarketingHeader";
import { apiBaseUrl, formatBdt, type PublicBooking } from "@/lib/api";

type BookingSuccessPageProps = {
  searchParams: Promise<{
    invoice?: string;
    status?: string;
    transaction?: string;
  }>;
};

async function getBooking(invoice?: string) {
  if (!invoice) return null;

  try {
    const response = await fetch(`${apiBaseUrl}/api/bookings/${encodeURIComponent(invoice)}`, {
      cache: "no-store",
    });

    if (!response.ok) return null;

    const data = (await response.json()) as { booking: PublicBooking };
    return data.booking;
  } catch {
    return null;
  }
}

export default async function BookingSuccessPage({ searchParams }: BookingSuccessPageProps) {
  const params = await searchParams;
  const booking = await getBooking(params.invoice);
  const status = params.status ?? booking?.paymentStatus ?? "success";
  const isSuccessful = ["success", "successful", "paid", "completed"].includes(status.toLowerCase());

  return (
    <>
      <MarketingHeader showAnnouncement={false} />
      <main className="mx-auto grid min-h-[calc(100vh-73px)] max-w-[980px] place-items-center px-5 py-12 md:px-7">
        <section className="w-full border border-line bg-[#fffefd] p-6 shadow-[0_24px_70px_rgba(23,22,19,0.08)] md:p-10">
          <div className="flex flex-col gap-7 md:flex-row md:items-start md:justify-between">
            <div className="max-w-[560px]">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#eef0ff] text-olive-dark">
                <Icon name={isSuccessful ? "check" : "clock"} className="h-5 w-5" />
              </span>
              <p className="mt-5 text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted">
                {isSuccessful ? "Slot booking successful" : "Booking payment received"}
              </p>
              <h1 className="mt-3 font-serif text-[42px] font-normal leading-none md:text-[56px]">
                {isSuccessful ? "Your turf is booked." : "We are checking this payment."}
              </h1>
              <p className="mt-5 text-sm leading-relaxed text-muted">
                {booking
                  ? "Keep this invoice handy. You can use it later on the booking inquiry page to check your turf, slot, and payment details."
                  : "We received the payment callback, but this server does not have the booking details in memory. Use the invoice ID below for support."}
              </p>
            </div>
            <div className="border border-line bg-panel/60 px-4 py-3 text-sm">
              <span className="block text-muted">Invoice</span>
              <strong className="mt-1 block text-lg">{params.invoice ?? "Unknown"}</strong>
              {params.transaction ? (
                <>
                  <span className="mt-3 block text-muted">Transaction</span>
                  <strong className="mt-1 block text-sm">{params.transaction}</strong>
                </>
              ) : null}
            </div>
          </div>

          {booking ? (
            <dl className="mt-9 grid border-y border-line md:grid-cols-4">
              {[
                ["Turf", booking.turfName],
                ["Booked slot", `${booking.date}, ${booking.slotRange}`],
                ["Payment", `${formatBdt(booking.payableAmountBdt)} ${booking.paymentMode === "advance" ? "advance" : "full"}`],
                ["Contact", booking.customerPhone],
              ].map(([label, value], index) => (
                <div key={label} className={`min-w-0 py-5 md:px-5 ${index > 0 ? "md:border-l md:border-line" : ""}`}>
                  <dt className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted">{label}</dt>
                  <dd className="mt-2 text-sm font-bold leading-relaxed">{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          <div className="mt-8 grid gap-3 sm:flex">
            <Link href="/" className="inline-flex min-h-11 items-center justify-center border border-olive bg-olive px-6 text-sm font-bold text-white transition hover:bg-olive-dark">
              Back to home
            </Link>
            <Link href="/booking/inquiry" className="inline-flex min-h-11 items-center justify-center border border-line bg-white px-6 text-sm font-bold transition hover:border-olive/50">
              Check booking
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
