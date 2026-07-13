import Link from "next/link";
import { MarketingHeader } from "@/components/MarketingHeader";

type MockPaymentPageProps = {
  searchParams: Promise<{ invoice?: string }>;
};

export default async function MockPaymentPage({ searchParams }: MockPaymentPageProps) {
  const { invoice } = await searchParams;

  return (
    <>
      <MarketingHeader showAnnouncement={false} />
      <main className="mx-auto grid min-h-[calc(100vh-73px)] max-w-[760px] place-items-center px-5 py-14">
        <section className="w-full border border-line bg-white p-7 shadow-[0_24px_70px_rgba(23,22,19,0.08)] md:p-10">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted">PayStation sandbox placeholder</p>
          <h1 className="mt-3 font-serif text-[42px] font-normal leading-none">Checkout ready</h1>
          <p className="mt-5 text-sm leading-relaxed text-muted">
            This local mock is shown while `PAYSTATION_PASSWORD` is still using the dummy value. Add the real password and set `PAYSTATION_MOCK=false` on the server to redirect to the hosted PayStation checkout.
          </p>
          <div className="mt-7 border-y border-line py-5 text-sm">
            <span className="block text-muted">Invoice</span>
            <strong className="mt-1 block text-lg">{invoice ?? "Pending invoice"}</strong>
          </div>
          <Link href="/#slots" className="mt-7 inline-flex min-h-11 items-center justify-center border border-olive bg-olive px-6 text-sm font-bold text-white transition hover:bg-olive-dark">
            Back to turfs
          </Link>
        </section>
      </main>
    </>
  );
}
