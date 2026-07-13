"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { products as seedProducts } from "@/data/catalog";
import type { Product, ProductStatus, Sale, SaleDiscount, SaleLine } from "@/lib/types";

const PRODUCTS_KEY = "zenvy-turfs-v1";
const SALES_KEY = "zenvy-bookings-v1";

function cloneProducts(products: Product[]) {
  return products.map((product) => ({
    ...product,
    tags: [...product.tags],
    images: product.images.map((image) => ({ ...image })),
    variants: product.variants.map((variant) => ({ ...variant })),
    dimensions: { ...product.dimensions },
  }));
}

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function readProducts() {
  if (typeof window === "undefined") return cloneProducts(seedProducts);
  return safeParse<Product[]>(window.localStorage.getItem(PRODUCTS_KEY), cloneProducts(seedProducts));
}

function writeProducts(products: Product[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
}

function readSales() {
  if (typeof window === "undefined") return [] as Sale[];
  return safeParse<Sale[]>(window.localStorage.getItem(SALES_KEY), []);
}

function writeSales(sales: Sale[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SALES_KEY, JSON.stringify(sales));
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 0 }).format(value);
}

export function makeSlug(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || `turf-${Date.now()}`;
}

export function emptyProduct(): Product {
  const image = "https://images.unsplash.com/photo-1589473912320-53d690064e06?auto=format&fit=crop&w=700&q=86";
  return {
    id: `turf-${Date.now()}`,
    name: "Untitled turf",
    brand: "Zenvy Central",
    sku: `ZV-${Math.floor(1000 + Math.random() * 8999)}`,
    category: "5-a-side",
    status: "draft",
    description: "Describe turf size, playing surface, adult player capacity, amenities, and what makes this field easy to book.",
    tags: ["new"],
    image,
    alt: "Football turf placeholder",
    images: [{ id: "primary", url: image, alt: "Football turf placeholder", primary: true }],
    priceRange: "BDT 0",
    wholesalePrice: 0,
    retailPrice: 0,
    currency: "BDT",
    paymentTerms: "Pay online",
    moq: 1,
    stock: 0,
    variants: [{ id: "default", name: "Slot", option: "Standard 60 min", sku: "ZV-SLOT", stock: 0, priceAdjustment: 0, active: true }],
    weight: "10 adult players",
    dimensions: { length: "", width: "", height: "", unit: "m" },
    leadTime: "Book up to 14 days ahead",
    origin: "Zenvy Central",
    returnPolicy: "Free reschedule up to 12 hours before kickoff.",
    featured: false,
    seoTitle: "",
    seoDescription: "",
  };
}

export function normalizeProduct(product: Product, status?: ProductStatus): Product {
  const variants = product.variants.length ? product.variants : emptyProduct().variants;
  const stock = variants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0);
  const activePrices = variants.map((variant) => Number(product.wholesalePrice || 0) + Number(variant.priceAdjustment || 0));
  const min = Math.min(...activePrices);
  const max = Math.max(...activePrices);
  const cleanName = product.name.trim() || "Untitled turf";
  const id = product.id || makeSlug(cleanName);
  const primary = product.images.find((image) => image.primary) ?? product.images[0];
  return {
    ...product,
    id,
    name: cleanName,
    status: status ?? product.status,
    sku: product.sku.trim() || id.toUpperCase().slice(0, 12),
    tags: product.tags.map((tag) => tag.trim()).filter(Boolean),
    image: primary?.url || product.image,
    alt: primary?.alt || product.alt || cleanName,
    images: product.images.length ? product.images : [{ id: `${id}-primary`, url: product.image, alt: product.alt || cleanName, primary: true }],
    wholesalePrice: Number(product.wholesalePrice || 0),
    retailPrice: Number(product.retailPrice || 0),
    moq: Math.max(1, Number(product.moq || 1)),
    stock,
    priceRange: min === max ? formatMoney(min) : `${formatMoney(min)}-${formatMoney(max)}`,
    variants: variants.map((variant, index) => ({
      ...variant,
      id: variant.id || `${id}-variant-${index + 1}`,
      sku: variant.sku.trim() || `${product.sku || id}-${index + 1}`,
      stock: Math.max(0, Number(variant.stock || 0)),
      priceAdjustment: Number(variant.priceAdjustment || 0),
    })),
  };
}

export function calculateSale(lines: SaleLine[], discount: SaleDiscount) {
  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const discountTotal = discount.type === "percent" ? subtotal * Math.min(discount.value, 100) / 100 : Math.min(discount.value, subtotal);
  return { subtotal, discountTotal, total: Math.max(0, subtotal - discountTotal) };
}

export function useProductStore() {
  const [products, setProducts] = useState<Product[]>(() => cloneProducts(seedProducts));
  const [sales, setSales] = useState<Sale[]>([]);

  useEffect(() => {
    setProducts(readProducts());
    setSales(readSales());
  }, []);

  const persistProducts = useCallback((nextProducts: Product[]) => {
    setProducts(nextProducts);
    writeProducts(nextProducts);
  }, []);

  const saveProduct = useCallback((product: Product, status?: ProductStatus) => {
    const normalized = normalizeProduct(product, status);
    const current = readProducts();
    const exists = current.some((item) => item.id === normalized.id);
    const nextProducts = exists ? current.map((item) => (item.id === normalized.id ? normalized : item)) : [normalized, ...current];
    persistProducts(nextProducts);
    return normalized;
  }, [persistProducts]);

  const saveSale = useCallback((sale: Omit<Sale, "id" | "createdAt" | "subtotal" | "discountTotal" | "total">) => {
    const totals = calculateSale(sale.lines, sale.discount);
    const nextSale: Sale = {
      ...sale,
      ...totals,
      id: `ZV-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
    };
    const nextSales = [nextSale, ...readSales()];
    setSales(nextSales);
    writeSales(nextSales);
    return nextSale;
  }, []);

  const resetDemoData = useCallback(() => {
    const nextProducts = cloneProducts(seedProducts);
    persistProducts(nextProducts);
    setSales([]);
    writeSales([]);
  }, [persistProducts]);

  return useMemo(() => ({ products, sales, saveProduct, saveSale, resetDemoData }), [products, sales, saveProduct, saveSale, resetDemoData]);
}
