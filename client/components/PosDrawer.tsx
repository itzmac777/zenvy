"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { calculateSale, formatMoney, useProductStore } from "@/lib/product-store";
import type { Product, Sale, SaleDiscount, SaleLine } from "@/lib/types";

type Quantities = Record<string, Record<string, number>>;

function buildLines(products: Product[], quantities: Quantities): SaleLine[] {
  return products.flatMap((product) =>
    product.variants
      .map((variant) => {
        const quantity = quantities[product.id]?.[variant.id] ?? 0;
        return {
          productId: product.id,
          productName: product.name,
          variantId: variant.id,
          variantName: variant.option,
          sku: variant.sku,
          quantity,
          unitPrice: product.wholesalePrice + variant.priceAdjustment,
        };
      })
      .filter((line) => line.quantity > 0),
  );
}

function invoiceHtml(sale: Sale) {
  const rows = sale.lines.map((line) => `<tr><td>${line.productName} / ${line.variantName}</td><td>${line.sku}</td><td>${line.quantity}</td><td>${formatMoney(line.unitPrice)}/hr</td><td>${formatMoney(line.quantity * line.unitPrice)}</td></tr>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Booking ${sale.id}</title><style>body{font-family:Arial,sans-serif;padding:40px;color:#171613}h1{font-family:serif;font-size:40px;font-weight:400}table{width:100%;border-collapse:collapse;margin-top:28px}td,th{border-bottom:1px solid #ddd;padding:12px;text-align:left}.total{text-align:right;margin-top:24px;font-size:20px}</style></head><body><h1>Zenvy Booking ${sale.id}</h1><p><strong>Player:</strong> ${sale.buyerName}<br><strong>Phone:</strong> ${sale.buyerPhone}<br><strong>Date:</strong> ${new Date(sale.createdAt).toLocaleString()}</p><table><thead><tr><th>Turf / Slot</th><th>Code</th><th>Hours</th><th>Rate</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><p class="total">Subtotal: ${formatMoney(sale.subtotal)}<br>Discount: ${formatMoney(sale.discountTotal)}<br><strong>Total: ${formatMoney(sale.total)}</strong></p><p>${sale.notes}</p></body></html>`;
}

export function PosDrawer() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const open = params.get("pos") === "open";
  const initialProduct = params.get("product");
  const { products, saveSale } = useProductStore();
  const [step, setStep] = useState(1);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(() => (initialProduct ? [initialProduct] : []));
  const [quantities, setQuantities] = useState<Quantities>({});
  const [buyerName, setBuyerName] = useState("Arman Shah");
  const [buyerPhone, setBuyerPhone] = useState("+15551234567");
  const [buyerEmail, setBuyerEmail] = useState("captain@thursdayxi.example");
  const [paymentMethod, setPaymentMethod] = useState("Card");
  const [notes, setNotes] = useState("Bring indoor boots. Arrive 10 minutes before kickoff.");
  const [discount, setDiscount] = useState<SaleDiscount>({ type: "percent", value: 0 });
  const [createdSale, setCreatedSale] = useState<Sale | null>(null);

  const filteredProducts = products.filter((product) => `${product.name} ${product.brand} ${product.sku}`.toLowerCase().includes(query.toLowerCase()));
  const selectedProducts = products.filter((product) => selectedIds.includes(product.id));
  const lines = useMemo(() => buildLines(selectedProducts, quantities), [selectedProducts, quantities]);
  const totals = calculateSale(lines, discount);

  function close() {
    const next = new URLSearchParams(params.toString());
    next.delete("pos");
    next.delete("product");
    router.push(`${pathname}${next.toString() ? `?${next}` : ""}`);
  }

  function toggleProduct(productId: string) {
    setSelectedIds((current) => (current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]));
  }

  function setVariantQuantity(productId: string, variantId: string, quantity: number) {
    setQuantities((current) => ({ ...current, [productId]: { ...(current[productId] ?? {}), [variantId]: Math.max(0, quantity) } }));
  }

  function createSale() {
    const sale = saveSale({ buyerName, buyerPhone, buyerEmail, paymentMethod, notes, discount, lines });
    setCreatedSale(sale);
    setStep(5);
  }

  function downloadInvoice() {
    if (!createdSale) return;
    const blob = new Blob([invoiceHtml(createdSale)], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${createdSale.id}-booking.html`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const whatsappHref = createdSale ? `https://wa.me/${createdSale.buyerPhone.replace(/\D/g, "")}?text=${encodeURIComponent(`Booking ${createdSale.id}: ${formatMoney(createdSale.total)} for ${createdSale.lines.length} turf slot(s). Thank you for booking with Zenvy.`)}` : "#";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm">
          <button type="button" aria-label="Close booking drawer" className="absolute inset-0 h-full w-full cursor-default" onClick={close} />
      <aside className="absolute inset-x-0 bottom-0 grid max-h-[94vh] overflow-hidden border border-line bg-paper shadow-[0_24px_90px_rgba(23,22,19,0.26)] md:inset-y-4 md:left-auto md:right-4 md:w-[560px]">
        <header className="flex items-start justify-between gap-4 border-b border-line p-5">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-muted">Turf booking</p>
            <h2 className="mt-1 font-serif text-[32px] font-normal leading-none">Create booking</h2>
          </div>
          <button type="button" onClick={close} className="border border-line bg-white px-3 py-2 text-sm font-bold">Close</button>
        </header>

        <div className="flex gap-1 border-b border-line p-3">
          {["Turfs", "Slots", "Player", "Review"].map((label, index) => (
            <button key={label} type="button" onClick={() => setStep(index + 1)} className={`min-h-9 flex-1 px-2 text-[11px] font-bold ${step === index + 1 ? "bg-olive text-white" : "bg-white/60 text-muted"}`}>{label}</button>
          ))}
        </div>

        <div className="overflow-y-auto p-5">
          {step === 1 ? (
            <section className="grid gap-4">
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search turfs by name, venue, or code..." className="min-h-12 border border-line bg-white px-3 text-sm outline-none focus:border-olive" />
              <div className="grid gap-3">
                {filteredProducts.map((product) => (
                  <button key={product.id} type="button" onClick={() => toggleProduct(product.id)} className={`grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3 border p-3 text-left ${selectedIds.includes(product.id) ? "border-olive bg-[#eef0ff]" : "border-line bg-white/70"}`}>
                    <Image src={product.image} alt={product.alt} width={80} height={80} className="h-16 w-16 object-cover" />
                    <span className="min-w-0"><strong className="block truncate font-serif text-xl font-normal">{product.name}</strong><small className="text-muted">{product.brand}</small></span>
                    <span className="text-sm font-bold">{product.priceRange}/hr</span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <section className="grid gap-4">
              {selectedProducts.map((product) => (
                <article key={product.id} className="border border-line bg-white/75 p-4">
                  <h3 className="font-serif text-2xl font-normal leading-none">{product.name}</h3>
                  <div className="mt-4 grid gap-2">
                    {product.variants.map((variant) => (
                      <div key={variant.id} className="grid grid-cols-[minmax(0,1fr)_96px] items-center gap-3 border border-line bg-panel/60 p-3">
                        <div><strong className="text-sm">{variant.option}</strong><p className="text-xs text-muted">{variant.sku} | {variant.stock} open | {formatMoney(product.wholesalePrice + variant.priceAdjustment)}/hr</p></div>
                        <input aria-label={`${variant.option} hours`} type="number" min="0" max={variant.stock} value={quantities[product.id]?.[variant.id] ?? 0} onChange={(event) => setVariantQuantity(product.id, variant.id, Number(event.target.value))} className="min-h-10 border border-line bg-white px-2 text-right text-sm font-bold" />
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </section>
          ) : null}

          {step === 3 ? (
            <section className="grid gap-4">
              <input value={buyerName} onChange={(event) => setBuyerName(event.target.value)} className="min-h-11 border border-line bg-white px-3 text-sm" placeholder="Player or captain name" />
              <input value={buyerPhone} onChange={(event) => setBuyerPhone(event.target.value)} className="min-h-11 border border-line bg-white px-3 text-sm" placeholder="WhatsApp phone" />
              <input value={buyerEmail} onChange={(event) => setBuyerEmail(event.target.value)} className="min-h-11 border border-line bg-white px-3 text-sm" placeholder="Email" />
              <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="min-h-11 border border-line bg-white px-3 text-sm"><option>Card</option><option>Cash</option><option>Bank transfer</option><option>Team split</option></select>
              <div className="grid grid-cols-[1fr_1fr] gap-3">
                <select value={discount.type} onChange={(event) => setDiscount({ ...discount, type: event.target.value as SaleDiscount["type"] })} className="min-h-11 border border-line bg-white px-3 text-sm"><option value="percent">Percent discount</option><option value="fixed">Fixed discount</option></select>
                <input type="number" min="0" value={discount.value} onChange={(event) => setDiscount({ ...discount, value: Number(event.target.value) })} className="min-h-11 border border-line bg-white px-3 text-sm" />
              </div>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-24 border border-line bg-white px-3 py-3 text-sm" />
            </section>
          ) : null}

          {step === 4 ? (
            <section className="grid gap-4">
              <div className="grid gap-2">
                {lines.map((line) => (
                  <div key={`${line.productId}-${line.variantId}`} className="flex justify-between gap-4 border-b border-line py-3 text-sm">
                    <span>{line.productName} / {line.variantName}<small className="block text-muted">{line.quantity} hr x {formatMoney(line.unitPrice)}</small></span>
                    <strong>{formatMoney(line.quantity * line.unitPrice)}</strong>
                  </div>
                ))}
              </div>
              <div className="grid gap-2 border border-line bg-white/70 p-4 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><strong>{formatMoney(totals.subtotal)}</strong></div>
                <div className="flex justify-between"><span>Discount</span><strong>-{formatMoney(totals.discountTotal)}</strong></div>
                <div className="flex justify-between text-lg"><span>Total</span><strong>{formatMoney(totals.total)}</strong></div>
              </div>
            </section>
          ) : null}

          {step === 5 && createdSale ? (
            <section className="grid gap-4 text-center">
              <h3 className="font-serif text-[34px] font-normal leading-none">Booking created</h3>
              <p className="text-sm text-muted">Receipt {createdSale.id} is ready for {createdSale.buyerName}.</p>
              <button type="button" onClick={downloadInvoice} className="min-h-11 border border-olive bg-olive px-5 text-sm font-bold text-white">Download receipt</button>
              <a href={whatsappHref} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center border border-line bg-white px-5 text-sm font-bold">Send receipt to WhatsApp</a>
              <button type="button" onClick={() => { setCreatedSale(null); setStep(1); }} className="min-h-11 border border-line bg-white/70 px-5 text-sm font-bold">Create another booking</button>
            </section>
          ) : null}
        </div>

        {step < 5 ? (
          <footer className="grid grid-cols-2 gap-3 border-t border-line p-4">
            <button type="button" onClick={() => setStep(Math.max(1, step - 1))} className="min-h-11 border border-line bg-white px-5 text-sm font-bold">Back</button>
            {step === 4 ? (
              <button type="button" disabled={!lines.length} onClick={createSale} className="min-h-11 border border-olive bg-olive px-5 text-sm font-bold text-white disabled:opacity-40">Create booking</button>
            ) : (
              <button type="button" disabled={step === 1 && !selectedIds.length} onClick={() => setStep(Math.min(4, step + 1))} className="min-h-11 border border-olive bg-olive px-5 text-sm font-bold text-white disabled:opacity-40">Continue</button>
            )}
          </footer>
        ) : null}
      </aside>
    </div>
  );
}
