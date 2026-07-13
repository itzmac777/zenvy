import { ProductFormShell } from "@/components/ProductFormShell";
import { SellerHeader } from "@/components/SellerHeader";

export default function NewProductPage() {
  return (
    <div className="dashboard-surface min-h-screen">
      <SellerHeader context="Create turf" />
      <main className="mx-auto max-w-[1180px] px-5 py-6 md:px-7 md:py-8 xl:px-11">
        <section className="mb-7">
          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.08em] text-muted">Turf builder</p>
          <h1 className="font-serif text-[42px] font-normal leading-none md:text-[clamp(42px,5vw,64px)]">Create turf</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">Add every player-facing detail, from hourly rates to slot availability and reschedule notes.</p>
        </section>
        <ProductFormShell />
      </main>
    </div>
  );
}
