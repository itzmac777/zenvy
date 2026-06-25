import { Button } from "@/components/Button";
import { FilterRail } from "@/components/FilterRail";
import { ProductInventoryCard } from "@/components/ProductInventoryCard";
import { SearchInput } from "@/components/SearchInput";
import { SellerHeader } from "@/components/SellerHeader";
import { products } from "@/data/catalog";

export default function ProductsPage() {
  return (
    <div className="dashboard-surface min-h-screen">
      <SellerHeader context="Product catalog" />
      <main className="mx-auto max-w-[1180px] px-5 py-6 md:px-7 md:py-8 xl:px-11">
        <section className="mb-6 flex items-start justify-between gap-7 md:items-end">
          <div>
            <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.08em] text-muted">Product inventory</p>
            <h1 className="font-serif text-[42px] font-normal leading-none md:text-[clamp(42px,5vw,64px)]">Products</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">Browse, preview, and update wholesale items with fewer taps.</p>
          </div>
          <Button href="#" className="hidden md:inline-flex">
            Add product
          </Button>
        </section>

        <section className="sticky top-16 z-20 -mx-5 mb-5 grid gap-3 border-b border-line/80 bg-paper/95 px-5 py-4 backdrop-blur-xl md:top-[79px] md:mx-0 md:px-0 md:pt-4" aria-label="Product search and filters">
          <SearchInput placeholder="Search product inventory..." />
          <FilterRail />
        </section>

        <section className="grid gap-3" aria-label="Product list">
          {products.map((product) => (
            <ProductInventoryCard key={product.id} product={product} />
          ))}
        </section>

        <div className="grid place-items-center gap-3 py-9">
          <Button href="#" variant="secondary" className="w-full max-w-[420px]">
            Load more products
          </Button>
          <p className="text-sm text-muted">Showing {products.length} of 248 items</p>
        </div>
      </main>
    </div>
  );
}
