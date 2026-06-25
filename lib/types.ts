export type ProductStatus = "active" | "low-stock" | "draft";

export type Product = {
  id: string;
  name: string;
  brand: string;
  priceRange: string;
  image: string;
  alt: string;
  stock: number;
  sku: string;
  status: ProductStatus;
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
  terms: string;
  ratingCount: number;
  image: string;
  alt: string;
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
  | "kids";
