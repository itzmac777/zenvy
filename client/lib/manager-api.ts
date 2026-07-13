import { apiBaseUrl } from "@/lib/api";

export type ManagerFieldSummary = {
  id: string;
  name: string;
  slug: string;
  code: string;
  status: "DRAFT" | "PUBLISHED" | "PAUSED" | "ARCHIVED";
  format: string;
  baseRateBdt: number;
  coverImage: string | null;
};

export type ManagerSession = {
  user: { id: string; phone: string; name: string | null; status: string; onboardedAt: string | null };
  fields: ManagerFieldSummary[];
  needsName: boolean;
  needsField: boolean;
  needsOnboarding: boolean;
};

export type FieldDetail = {
  id: string;
  name: string;
  slug: string;
  code: string;
  status: "DRAFT" | "PUBLISHED" | "PAUSED" | "ARCHIVED";
  format: string;
  description: string;
  capacity: number;
  surface: string;
  dimensions: { lengthM: number | null; widthM: number | null; heightM: number | null };
  amenities: string[];
  featured: boolean;
  bookingWindowDays: number;
  minLeadMinutes: number;
  reschedulePolicy: string;
  pricing: {
    mode: "SAME_ALL_DAY" | "DAY_NIGHT" | "CUSTOM";
    baseRateBdt: number;
    dayStart: string;
    nightStart: string;
    dayRateBdt: number | null;
    nightRateBdt: number | null;
    minimumRateBdt: number;
    maximumRateBdt: number;
    rules: Array<{ id?: string; dayOfWeek: number; startTime: string; priceBdt: number }>;
  };
  weeklyHours: Array<{ dayOfWeek: number; isClosed: boolean; opensAt: string; closesAt: string }>;
  address: string;
  area: string;
  city: string;
  contactPhone: string;
  locationDetails: { address: string; area: string; city: string; contactPhone: string };
  images: Array<{ id: string; url: string; alt: string; isCover: boolean; position: number }>;
  image: string | null;
  location: string;
  price: string;
  hourlyRate: number;
  openingHours: string;
  pitchSize: string;
};

export type ManagerBooking = {
  id: string;
  invoiceNumber: string;
  fieldId: string;
  fieldName: string;
  turfName: string;
  venueName: string;
  source: "PUBLIC" | "MANAGER";
  status: "PENDING_PAYMENT" | "CONFIRMED" | "CANCELLED" | "EXPIRED";
  paymentMode: "advance" | "full" | "manual";
  customerPhone: string;
  customerName: string | null;
  customerEmail: string | null;
  notes: string | null;
  totalAmountBdt: number;
  payableAmountBdt: number;
  paidAmountBdt: number;
  balanceAmountBdt: number;
  refundRequired: boolean;
  slots: Array<{ id: string; startAt: string; endAt: string; priceBdt: number }>;
  date: string;
  slotRange: string;
  createdAt: string;
  updatedAt: string;
};

export type AvailabilitySlot = {
  id: string;
  startAt: string;
  endAt: string;
  time: string;
  label: string;
  priceBdt: number;
  status: "AVAILABLE" | "HELD" | "BOOKED" | "MANUAL_BOOKED" | "BLOCKED" | "CLOSED";
  occupancy?: {
    id: string;
    kind: "HOLD" | "BOOKING" | "BLOCK";
    expiresAt: string | null;
    booking: null | {
      id: string;
      invoiceNumber: string;
      source: "PUBLIC" | "MANAGER";
      status: string;
      customerPhone: string;
      customerName: string | null;
      customerEmail: string | null;
      totalAmountBdt: number;
      paidAmountBdt: number;
      balanceAmountBdt: number;
      notes: string | null;
    };
    block: null | { id: string; reason: string; note: string | null };
  };
};

export type AvailabilityResponse = {
  field: { id: string; name: string; slug: string; status: string; baseRateBdt: number; pricingMode: string };
  days: Array<{ date: string; slots: AvailabilitySlot[] }>;
};

export async function managerApi<T>(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(`${apiBaseUrl}${path}`, { ...options, headers, credentials: "include" });
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message ?? "Unable to complete this request.");
  return data as T;
}

export function formatBdt(value: number) {
  return new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 0 }).format(value);
}

export function dateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
