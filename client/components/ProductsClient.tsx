"use client";

import { Button } from "@/components/Button";
import { ProductInventoryCard } from "@/components/ProductInventoryCard";
import { useProductStore } from "@/lib/product-store";

export function ProductsClient() {
  const { products, resetDemoData } = useProductStore();

  return (
    <>
      <section className="grid gap-3" aria-label="Turf list">
        {products.map((product) => (
          <ProductInventoryCard key={product.id} product={product} />
        ))}
      </section>

      <div className="grid place-items-center gap-3 py-9">
        <div className="grid w-full max-w-[420px] gap-2 md:grid-cols-2">
          <Button href="/products/new" className="w-full">
            Add turf
          </Button>
          <button type="button" onClick={resetDemoData} className="inline-flex min-h-11 items-center justify-center border border-line bg-white/70 px-6 text-sm font-bold">
            Reset demo data
          </button>
        </div>
        <p className="text-sm text-muted">Showing {products.length} persisted demo turfs</p>
      </div>
    </>
  );
}
