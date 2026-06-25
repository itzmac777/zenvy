import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProductInventoryCard({ product }: { product: Product }) {
  return (
    <article className="-mx-5 grid grid-cols-[74px_minmax(0,1fr)_auto] items-start gap-3.5 border-y border-line bg-white/75 px-5 py-5 md:mx-0 md:min-h-32 md:grid-cols-[88px_minmax(0,1fr)_auto] md:items-center md:rounded-xl md:border md:px-4 md:py-4 md:shadow-soft xl:grid-cols-[96px_minmax(0,1fr)_auto_auto] xl:gap-5">
      <Image src={product.image} alt={product.alt} width={192} height={192} className="h-[74px] w-[74px] rounded-md object-cover md:h-[88px] md:w-[88px] xl:h-24 xl:w-24" />
      <div className="grid min-w-0 gap-2.5">
        <div>
          <h2 className="line-clamp-2 font-serif text-xl font-normal leading-[1.1] md:truncate md:text-2xl">{product.name}</h2>
          <p className="mt-1 text-[13px] text-muted md:text-sm">{product.brand}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span
            className={cn(
              "inline-flex min-h-5 items-center rounded px-1.5 text-[11px] font-bold tracking-[0.02em] md:min-h-[22px] md:px-2 md:text-xs",
              product.status === "low-stock" ? "bg-[#f1d9d2] text-[#7a4337]" : "bg-[#eee8dd] text-[#2b2824]",
            )}
          >
            {product.status === "low-stock" ? `Low stock: ${product.stock}` : `Stock: ${product.stock}`}
          </span>
          <span className="inline-flex min-h-5 items-center rounded bg-[#eee8dd] px-1.5 text-[11px] font-bold tracking-[0.02em] text-[#2b2824] md:min-h-[22px] md:px-2 md:text-xs">SKU: {product.sku}</span>
        </div>
      </div>
      <strong className="justify-self-end whitespace-nowrap font-serif text-[15px] font-normal leading-none md:text-[19px]">{product.priceRange}</strong>
      <div className="col-start-2 col-end-4 flex flex-wrap gap-3 justify-self-start md:col-start-2 xl:col-start-auto xl:justify-self-end">
        <Link href="#" className="inline-flex min-h-8 items-center gap-1.5 text-[13px] font-bold md:rounded-full md:border md:border-line md:bg-panel md:px-3">
          <Icon name="eye" className="h-[15px] w-[15px]" />
          Preview
        </Link>
        <Link href="#" className="inline-flex min-h-8 items-center gap-1.5 text-[13px] font-bold md:rounded-full md:border md:border-line md:bg-panel md:px-3">
          <Icon name="edit" className="h-[15px] w-[15px]" />
          Modify
        </Link>
      </div>
    </article>
  );
}
