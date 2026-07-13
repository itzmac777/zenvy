"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { Button } from "@/components/Button";
import { formatMoney, useProductStore } from "@/lib/product-store";

export function ProductPreviewClient({ productId }: { productId: string }) {
  const { products } = useProductStore();
  const product = useMemo(() => products.find((item) => item.id === productId), [productId, products]);

  if (!product) {
    return (
      <section className="border border-line bg-white/75 p-7 text-center shadow-soft">
        <h1 className="font-serif text-[38px] font-normal leading-none">Turf not found</h1>
        <p className="mt-3 text-sm text-muted">This field may only exist in another browser session.</p>
        <Button href="/products" className="mt-6">Back to turfs</Button>
      </section>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,0.58fr)_minmax(360px,0.42fr)]">
      <section className="grid gap-4">
        <Image src={product.image} alt={product.alt} width={1000} height={1000} className="aspect-square w-full border border-line bg-[#efe8dd] object-cover" priority />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {product.images.map((image) => (
            <Image key={image.id} src={image.url} alt={image.alt} width={260} height={260} className="aspect-square w-full border border-line object-cover" />
          ))}
        </div>
      </section>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="border border-line bg-white/78 p-5 shadow-soft md:p-7">
          <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-muted">{product.brand}</p>
          <h1 className="mt-3 font-serif text-[44px] font-normal leading-none md:text-[58px]">{product.name}</h1>
          <p className="mt-5 text-[15px] leading-relaxed text-muted">{product.description}</p>
          <div className="mt-6 grid grid-cols-2 gap-3 border-y border-line py-5 text-sm">
            <div><span className="block text-muted">Booking rate</span><strong className="font-serif text-2xl font-normal">{product.priceRange}/hr</strong></div>
            <div><span className="block text-muted">Peak rate</span><strong className="font-serif text-2xl font-normal">{formatMoney(product.retailPrice)}/hr</strong></div>
            <div><span className="block text-muted">Minimum</span><strong>{product.moq} slot</strong></div>
            <div><span className="block text-muted">Terms</span><strong>{product.paymentTerms}</strong></div>
          </div>
          <div className="mt-6">
            <h2 className="text-sm font-bold">Bookable slots</h2>
            <div className="mt-3 grid gap-2">
              {product.variants.map((variant) => (
                <div key={variant.id} className="flex items-center justify-between gap-4 border border-line bg-panel/60 px-3 py-2 text-sm">
                  <span>{variant.option}</span>
                  <span className="text-muted">{variant.stock} open</span>
                  <strong>{formatMoney(product.wholesalePrice + variant.priceAdjustment)}/hr</strong>
                </div>
              ))}
            </div>
          </div>
          <dl className="mt-6 grid gap-3 border-t border-line pt-5 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-muted">Advance booking</dt><dd className="font-bold text-right">{product.leadTime}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Venue</dt><dd className="font-bold">{product.origin}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Pitch size</dt><dd className="font-bold">{product.dimensions.length} x {product.dimensions.width} x {product.dimensions.height} {product.dimensions.unit}</dd></div>
          </dl>
          <div className="mt-7 grid gap-3 md:grid-cols-2">
            <Button href={`/products/${product.id}/edit`} variant="secondary">Modify turf</Button>
            <Link href={`/products?pos=open&product=${product.id}`} className="inline-flex min-h-11 items-center justify-center border border-olive bg-olive px-6 text-sm font-bold text-white">
              Book this turf
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
}
