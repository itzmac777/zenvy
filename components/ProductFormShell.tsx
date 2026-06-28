"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { emptyProduct, makeSlug, useProductStore } from "@/lib/product-store";
import type { Product, ProductStatus, ProductVariant } from "@/lib/types";

const categories = ["Home Decor", "Food & Drink", "Beauty", "Jewelry", "Kids"];
const statuses: ProductStatus[] = ["draft", "active", "low-stock", "archived"];
const inputClass = "min-h-11 border border-line bg-white/80 px-3 text-sm text-ink outline-none transition focus:border-olive";
const textareaClass = "min-h-28 border border-line bg-white/80 px-3 py-3 text-sm leading-relaxed text-ink outline-none transition focus:border-olive";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-[12px] font-bold uppercase tracking-[0.06em] text-muted">
      {label}
      {children}
    </label>
  );
}

export function ProductFormShell({ productId }: { productId?: string }) {
  const router = useRouter();
  const { products, saveProduct } = useProductStore();
  const sourceProduct = useMemo(() => products.find((item) => item.id === productId), [productId, products]);
  const [product, setProduct] = useState<Product>(() => sourceProduct ?? emptyProduct());
  const isEditing = Boolean(productId);

  useEffect(() => {
    if (sourceProduct) setProduct(sourceProduct);
  }, [sourceProduct]);

  function update<Key extends keyof Product>(key: Key, value: Product[Key]) {
    setProduct((current) => ({ ...current, [key]: value }));
  }

  function updateVariant(index: number, patch: Partial<ProductVariant>) {
    setProduct((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) => (variantIndex === index ? { ...variant, ...patch } : variant)),
    }));
  }

  function addVariant() {
    setProduct((current) => ({
      ...current,
      variants: [
        ...current.variants,
        { id: `variant-${Date.now()}`, name: "Option", option: "New variant", sku: `${current.sku}-${current.variants.length + 1}`, stock: 0, priceAdjustment: 0, active: true },
      ],
    }));
  }

  function removeVariant(index: number) {
    setProduct((current) => ({ ...current, variants: current.variants.filter((_, variantIndex) => variantIndex !== index) }));
  }

  function syncPrimaryImage(url: string) {
    const nextUrl = url.trim();
    setProduct((current) => ({
      ...current,
      image: nextUrl,
      images: [{ id: "primary", url: nextUrl, alt: current.alt || current.name, primary: true }],
    }));
  }

  function handleSave(status: ProductStatus, destination?: "preview" | "list") {
    const id = isEditing ? product.id : makeSlug(product.name);
    const saved = saveProduct({ ...product, id }, status);
    if (destination === "preview") router.push(`/products/${saved.id}`);
    if (destination === "list") router.push("/products");
  }

  return (
    <div className="grid gap-6 pb-28 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="grid gap-5">
        <section className="border border-line bg-white/75 p-5 shadow-soft md:p-7">
          <h2 className="font-serif text-[28px] font-normal leading-none">Basics</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field label="Product name">
              <input className={inputClass} value={product.name} onChange={(event) => update("name", event.target.value)} />
            </Field>
            <Field label="Brand">
              <input className={inputClass} value={product.brand} onChange={(event) => update("brand", event.target.value)} />
            </Field>
            <Field label="SKU">
              <input className={inputClass} value={product.sku} onChange={(event) => update("sku", event.target.value)} />
            </Field>
            <Field label="Category">
              <select className={inputClass} value={product.category} onChange={(event) => update("category", event.target.value)}>
                {categories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </Field>
            <div className="md:col-span-2">
              <Field label="Description">
                <textarea className={textareaClass} value={product.description} onChange={(event) => update("description", event.target.value)} />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Tags, comma separated">
                <input className={inputClass} value={product.tags.join(", ")} onChange={(event) => update("tags", event.target.value.split(",").map((tag) => tag.trim()))} />
              </Field>
            </div>
          </div>
        </section>

        <section className="border border-line bg-white/75 p-5 shadow-soft md:p-7">
          <h2 className="font-serif text-[28px] font-normal leading-none">Media</h2>
          <div className="mt-6 grid gap-4">
            <Field label="Primary image URL">
              <input className={inputClass} value={product.image} onChange={(event) => syncPrimaryImage(event.target.value)} />
            </Field>
            <Field label="Alt text">
              <input className={inputClass} value={product.alt} onChange={(event) => update("alt", event.target.value)} />
            </Field>
          </div>
        </section>

        <section className="border border-line bg-white/75 p-5 shadow-soft md:p-7">
          <h2 className="font-serif text-[28px] font-normal leading-none">Pricing</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Field label="Wholesale price">
              <input className={inputClass} type="number" min="0" step="0.01" value={product.wholesalePrice} onChange={(event) => update("wholesalePrice", Number(event.target.value))} />
            </Field>
            <Field label="Retail price">
              <input className={inputClass} type="number" min="0" step="0.01" value={product.retailPrice} onChange={(event) => update("retailPrice", Number(event.target.value))} />
            </Field>
            <Field label="MOQ">
              <input className={inputClass} type="number" min="1" value={product.moq} onChange={(event) => update("moq", Number(event.target.value))} />
            </Field>
            <Field label="Payment terms">
              <input className={inputClass} value={product.paymentTerms} onChange={(event) => update("paymentTerms", event.target.value)} />
            </Field>
            <Field label="Status">
              <select className={inputClass} value={product.status} onChange={(event) => update("status", event.target.value as ProductStatus)}>
                {statuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </Field>
            <Field label="Featured">
              <select className={inputClass} value={product.featured ? "yes" : "no"} onChange={(event) => update("featured", event.target.value === "yes")}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </Field>
          </div>
        </section>

        <section className="border border-line bg-white/75 p-5 shadow-soft md:p-7">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-serif text-[28px] font-normal leading-none">Variants & inventory</h2>
            <button type="button" onClick={addVariant} className="border border-line bg-white px-3 py-2 text-xs font-bold">
              Add variant
            </button>
          </div>
          <div className="mt-5 grid gap-3">
            {product.variants.map((variant, index) => (
              <article key={variant.id} className="grid gap-3 border border-line bg-panel/60 p-3 md:grid-cols-[1fr_1fr_1fr_100px_120px_auto] md:items-end">
                <Field label="Name">
                  <input className={inputClass} value={variant.name} onChange={(event) => updateVariant(index, { name: event.target.value })} />
                </Field>
                <Field label="Option">
                  <input className={inputClass} value={variant.option} onChange={(event) => updateVariant(index, { option: event.target.value })} />
                </Field>
                <Field label="SKU">
                  <input className={inputClass} value={variant.sku} onChange={(event) => updateVariant(index, { sku: event.target.value })} />
                </Field>
                <Field label="Stock">
                  <input className={inputClass} type="number" min="0" value={variant.stock} onChange={(event) => updateVariant(index, { stock: Number(event.target.value) })} />
                </Field>
                <Field label="Price adj.">
                  <input className={inputClass} type="number" step="0.01" value={variant.priceAdjustment} onChange={(event) => updateVariant(index, { priceAdjustment: Number(event.target.value) })} />
                </Field>
                <button type="button" onClick={() => removeVariant(index)} disabled={product.variants.length === 1} className="min-h-11 border border-line bg-white px-3 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40">
                  Remove
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="border border-line bg-white/75 p-5 shadow-soft md:p-7">
          <h2 className="font-serif text-[28px] font-normal leading-none">Shipping</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Field label="Weight">
              <input className={inputClass} value={product.weight} onChange={(event) => update("weight", event.target.value)} />
            </Field>
            <Field label="Length">
              <input className={inputClass} value={product.dimensions.length} onChange={(event) => update("dimensions", { ...product.dimensions, length: event.target.value })} />
            </Field>
            <Field label="Width">
              <input className={inputClass} value={product.dimensions.width} onChange={(event) => update("dimensions", { ...product.dimensions, width: event.target.value })} />
            </Field>
            <Field label="Height">
              <input className={inputClass} value={product.dimensions.height} onChange={(event) => update("dimensions", { ...product.dimensions, height: event.target.value })} />
            </Field>
            <Field label="Lead time">
              <input className={inputClass} value={product.leadTime} onChange={(event) => update("leadTime", event.target.value)} />
            </Field>
            <Field label="Origin">
              <input className={inputClass} value={product.origin} onChange={(event) => update("origin", event.target.value)} />
            </Field>
            <div className="md:col-span-3">
              <Field label="Return policy">
                <textarea className={textareaClass} value={product.returnPolicy} onChange={(event) => update("returnPolicy", event.target.value)} />
              </Field>
            </div>
          </div>
        </section>

        <section className="border border-line bg-white/75 p-5 shadow-soft md:p-7">
          <h2 className="font-serif text-[28px] font-normal leading-none">Publishing</h2>
          <div className="mt-6 grid gap-4">
            <Field label="SEO title">
              <input className={inputClass} value={product.seoTitle} onChange={(event) => update("seoTitle", event.target.value)} />
            </Field>
            <Field label="SEO description">
              <textarea className={textareaClass} value={product.seoDescription} onChange={(event) => update("seoDescription", event.target.value)} />
            </Field>
          </div>
        </section>
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-24 border border-line bg-white/75 p-5 shadow-soft">
          <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-muted">Live summary</p>
          <h2 className="mt-3 font-serif text-[30px] font-normal leading-none">{product.name}</h2>
          <p className="mt-2 text-sm text-muted">{product.brand}</p>
          <dl className="mt-5 grid gap-3 border-t border-line pt-5 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-muted">Category</dt><dd className="font-bold">{product.category}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">MOQ</dt><dd className="font-bold">{product.moq}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Variants</dt><dd className="font-bold">{product.variants.length}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Status</dt><dd className="font-bold capitalize">{product.status}</dd></div>
          </dl>
        </div>
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-5 py-3 backdrop-blur-xl md:px-7">
        <div className="mx-auto grid max-w-[1180px] gap-2 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
          <p className="hidden text-sm text-muted md:block">Save changes locally for demo inventory and POS.</p>
          <button type="button" onClick={() => handleSave("draft", "list")} className="min-h-11 border border-line bg-white px-5 text-sm font-bold">Save draft</button>
          <button type="button" onClick={() => handleSave("active", "preview")} className="min-h-11 border border-olive bg-olive px-5 text-sm font-bold text-white">Publish & preview</button>
          <Link href="/products" className="inline-flex min-h-11 items-center justify-center border border-line bg-white/70 px-5 text-sm font-bold">Cancel</Link>
        </div>
      </div>
    </div>
  );
}
