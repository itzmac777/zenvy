import type { ActivityItem, Category, Kpi, LandingProduct, Product, QuickAction } from "@/lib/types";

export const categories: Category[] = [
  { label: "Home Decor", href: "#home", icon: "home" },
  { label: "Food & Drink", href: "#food", icon: "cup" },
  { label: "Beauty", href: "#beauty", icon: "beauty" },
  { label: "Jewelry", href: "#jewelry", icon: "jewelry" },
  { label: "Kids", href: "#kids", icon: "kids" },
];

export const landingProducts: LandingProduct[] = [
  {
    id: "ripple-vase",
    name: "Ripple Ceramic Vase",
    brand: "Sunday Muse",
    price: "$22.00",
    terms: "Net 60",
    ratingCount: 62,
    image: "https://images.unsplash.com/photo-1602872030490-4a484a7b3ba6?auto=format&fit=crop&w=700&q=86",
    alt: "Ripple ceramic vase with green branches",
  },
  {
    id: "amber-candle",
    name: "Amber & Moss Candle",
    brand: "Fieldpar Co.",
    price: "$18.50",
    terms: "Net 60",
    ratingCount: 48,
    image: "https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=700&q=86",
    alt: "Amber glass candle",
  },
  {
    id: "linen-pillow",
    name: "Soft Linen Pillow Cover",
    brand: "Wild Earth",
    price: "$28.00",
    terms: "Net 60",
    ratingCount: 73,
    image: "https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=700&q=86",
    alt: "Soft neutral linen pillow cover",
  },
  {
    id: "speckled-mug",
    name: "Speckled Mug",
    brand: "Casa Palma",
    price: "$9.25",
    terms: "Net 60",
    ratingCount: 35,
    image: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=700&q=86",
    alt: "Speckled ceramic mug",
  },
];

export const kpis: Kpi[] = [
  { label: "Wholesale revenue", value: "$48,290", trend: "+12.4% from last week", tone: "positive" },
  { label: "Open orders", value: "318", trend: "42 ready to fulfill", tone: "positive" },
  { label: "Reorder rate", value: "41%", trend: "18 buyers reordered", tone: "neutral" },
  { label: "Products live", value: "126", trend: "6 need inventory updates", tone: "warning" },
];

export const quickActions: QuickAction[] = [
  { label: "Add product", href: "/products", icon: "plus" },
  { label: "Create sale", href: "#", icon: "refresh" },
  { label: "Print labels", href: "#", icon: "printer" },
  { label: "Review orders", href: "#", icon: "wand" },
  { label: "View analytics", href: "#", icon: "analytics" },
];

export const activityItems: ActivityItem[] = [
  { id: "order-ready", title: "Order #ZV-1048 was marked ready to ship.", meta: "2 minutes ago by Julia Park" },
  { id: "draft-created", title: "New product draft created: Linen Pillow Cover.", meta: "18 minutes ago by Maya Chen" },
  { id: "sale-live", title: "Wholesale sale Early Summer Home went live.", meta: "1 hour ago by Julia Park" },
  { id: "inventory-updated", title: "Inventory updated for Amber & Moss Candle.", meta: "Yesterday at 4:12 PM" },
];

export const products: Product[] = [
  {
    id: "earthen-vessel-04",
    name: "Earthen Vessel No. 04",
    brand: "Loom & Thread",
    priceRange: "$118-$142",
    image: "https://images.unsplash.com/photo-1602872030490-4a484a7b3ba6?auto=format&fit=crop&w=500&q=86",
    alt: "Earthen vessel in soft natural light",
    stock: 42,
    sku: "LV-920",
    status: "active",
  },
  {
    id: "organic-cotton-throw",
    name: "Organic Cotton Throw",
    brand: "Nordic Hues",
    priceRange: "$74-$96",
    image: "https://images.unsplash.com/photo-1604014237800-1c9102c219da?auto=format&fit=crop&w=500&q=86",
    alt: "Organic cotton throw in deep green",
    stock: 4,
    sku: "NH-042",
    status: "low-stock",
  },
  {
    id: "articulated-brass-lamp",
    name: "Articulated Brass Lamp",
    brand: "Lumen Studio",
    priceRange: "$245-$295",
    image: "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=500&q=86",
    alt: "Articulated brass lamp detail",
    stock: 12,
    sku: "LS-881",
    status: "active",
  },
  {
    id: "pantry-vessel-set",
    name: "Pantry Vessel Set",
    brand: "Kitchen Archetype",
    priceRange: "$48-$62",
    image: "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&w=500&q=86",
    alt: "Pantry vessel set on a shelf",
    stock: 156,
    sku: "KA-102",
    status: "active",
  },
  {
    id: "midnight-cedar-candle",
    name: "Midnight Cedar Candle",
    brand: "Aura Botanics",
    priceRange: "$36-$48",
    image: "https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=500&q=86",
    alt: "Midnight cedar candle in amber glass",
    stock: 89,
    sku: "AB-540",
    status: "active",
  },
];
