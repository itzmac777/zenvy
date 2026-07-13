export type ProductStatus = "active" | "low-stock" | "draft" | "archived";

export type ProductVariant = {
  id: string;
  name: string;
  option: string;
  sku: string;
  stock: number;
  priceAdjustment: number;
  active: boolean;
};

export type ProductDimensions = {
  length: string;
  width: string;
  height: string;
  unit: "in" | "cm" | "m";
};

export type ProductImage = {
  id: string;
  url: string;
  alt: string;
  primary?: boolean;
};

export type Product = {
  id: string;
  name: string;
  brand: string;
  sku: string;
  category: string;
  status: ProductStatus;
  description: string;
  tags: string[];
  image: string;
  alt: string;
  images: ProductImage[];
  priceRange: string;
  wholesalePrice: number;
  retailPrice: number;
  currency: "BDT";
  paymentTerms: string;
  moq: number;
  stock: number;
  variants: ProductVariant[];
  weight: string;
  dimensions: ProductDimensions;
  leadTime: string;
  origin: string;
  returnPolicy: string;
  featured: boolean;
  seoTitle: string;
  seoDescription: string;
};

export type SaleDiscount = {
  type: "fixed" | "percent";
  value: number;
};

export type SaleLine = {
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
};

export type Sale = {
  id: string;
  createdAt: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  paymentMethod: string;
  notes: string;
  discount: SaleDiscount;
  lines: SaleLine[];
  subtotal: number;
  discountTotal: number;
  total: number;
};

export type Kpi = {
  label: string;
  value: string;
  trend: string;
  tone: "positive" | "neutral" | "warning";
};

export type QuickAction = {
  label: string;
  href: string;
  icon: IconName;
};

export type ActivityItem = {
  id: string;
  title: string;
  meta: string;
};

export type LandingProduct = {
  id: string;
  name: string;
  brand: string;
  price: string;
  hourlyRate: number;
  terms: string;
  rating: number;
  ratingCount: number;
  image: string;
  alt: string;
  location: string;
  description: string;
  format: string;
  capacity: string;
  surface: string;
  pitchSize: string;
  openingHours: string;
  amenities: string[];
};

export type Category = {
  label: string;
  href: string;
  icon: IconName;
};

export type IconName =
  | "analytics"
  | "bell"
  | "box"
  | "calendar"
  | "card"
  | "chart"
  | "filters"
  | "home"
  | "jewelry"
  | "menu"
  | "package"
  | "plus"
  | "printer"
  | "refresh"
  | "search"
  | "tag"
  | "users"
  | "wand"
  | "edit"
  | "eye"
  | "beauty"
  | "cup"
  | "kids"
  | "field"
  | "clock"
  | "shield"
  | "briefcase"
  | "ball"
  | "arrow-left"
  | "arrow-right"
  | "arrow-down"
  | "check"
  | "location";
