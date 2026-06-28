import { ProductPreviewClient } from "@/components/ProductPreviewClient";
import { SellerHeader } from "@/components/SellerHeader";

export default async function ProductPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="dashboard-surface min-h-screen">
      <SellerHeader context="Product preview" />
      <main className="mx-auto max-w-[1180px] px-5 py-6 md:px-7 md:py-8 xl:px-11">
        <ProductPreviewClient productId={id} />
      </main>
    </div>
  );
}
