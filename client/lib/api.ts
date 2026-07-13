export const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export type PublicBooking = {
  invoiceNumber: string;
  turfId: string;
  turfName: string;
  date: string;
  times: string[];
  slotRange: string;
  totalAmountBdt: number;
  payableAmountBdt: number;
  paymentMode: "advance" | "full" | "manual";
  customerEmail: string | null;
  customerPhone: string;
  paymentStatus: string;
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
};

export type PublicField = {
  id: string;
  name: string;
  slug: string;
  code: string;
  status: "PUBLISHED";
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
  pricing: { mode: "SAME_ALL_DAY" | "DAY_NIGHT" | "CUSTOM"; baseRateBdt: number; minimumRateBdt: number; maximumRateBdt: number };
  weeklyHours: Array<{ dayOfWeek: number; isClosed: boolean; opensAt: string; closesAt: string }>;
  openingHours: string;
  address: string;
  area: string;
  city: string;
  contactPhone: string;
  locationDetails: { address: string; area: string; city: string; contactPhone: string };
  images: Array<{ id: string; url: string; alt: string; isCover: boolean; position: number }>;
  image: string | null;
  alt: string;
  location: string;
  price: string;
  hourlyRate: number;
  terms: string;
  rating: number;
  ratingCount: number;
  pitchSize: string;
};

export function formatBdt(value: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(value);
}
