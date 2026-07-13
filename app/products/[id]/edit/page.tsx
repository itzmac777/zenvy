import { ProductFormShell } from "@/components/ProductFormShell";
import { SellerHeader } from "@/components/SellerHeader";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="dashboard-surface min-h-screen">
      <SellerHeader context="Modify turf" />
      <main className="mx-auto max-w-[1180px] px-5 py-6 md:px-7 md:py-8 xl:px-11">
        <section className="mb-7">
          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.08em] text-muted">Turf editor</p>
          <h1 className="font-serif text-[42px] font-normal leading-none md:text-[clamp(42px,5vw,64px)]">Modify turf</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">Update field details, slot availability, hourly rates, and publishing metadata.</p>
        </section>
        <ProductFormShell productId={id} />
      </main>
    </div>
  );
}
