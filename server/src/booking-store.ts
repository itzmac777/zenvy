import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { PaymentMode } from "./paystation.js";

export type BookingRecord = {
  invoiceNumber: string;
  turfId: string;
  turfName: string;
  date: string;
  times: string[];
  slotRange: string;
  totalAmountBdt: number;
  payableAmountBdt: number;
  paymentMode: PaymentMode;
  customerEmail: string;
  customerPhone: string;
  paymentStatus: string;
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDirectory = resolve(__dirname, "..", "data");
const bookingFile = resolve(dataDirectory, "bookings.json");
const bookings = new Map<string, BookingRecord>();

function persistBookings() {
  mkdirSync(dataDirectory, { recursive: true });
  writeFileSync(bookingFile, JSON.stringify([...bookings.values()], null, 2));
}

function loadBookings() {
  if (!existsSync(bookingFile)) return;

  try {
    const stored = JSON.parse(readFileSync(bookingFile, "utf8")) as BookingRecord[];
    stored.forEach((booking) => bookings.set(booking.invoiceNumber, booking));
  } catch {
    bookings.clear();
  }
}

loadBookings();

export function saveBooking(booking: BookingRecord) {
  bookings.set(booking.invoiceNumber, booking);
  persistBookings();
}

export function getBooking(invoiceNumber: string) {
  return bookings.get(invoiceNumber);
}

export function updateBooking(invoiceNumber: string, patch: Partial<Pick<BookingRecord, "paymentStatus" | "transactionId" | "updatedAt">>) {
  const booking = bookings.get(invoiceNumber);
  if (!booking) return undefined;

  const nextBooking = { ...booking, ...patch };
  saveBooking(nextBooking);
  return nextBooking;
}

export function searchBookings(query: string) {
  const phoneQuery = query.replace(/\D/g, "");
  const normalizedQuery = query.toLowerCase();

  return [...bookings.values()]
    .filter((booking) => {
      const matchesInvoice = booking.invoiceNumber.toLowerCase() === normalizedQuery;
      const matchesPhone = phoneQuery.length >= 5 && booking.customerPhone.replace(/\D/g, "").endsWith(phoneQuery);
      return matchesInvoice || matchesPhone;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function serializeBooking(booking: BookingRecord) {
  return {
    invoiceNumber: booking.invoiceNumber,
    turfId: booking.turfId,
    turfName: booking.turfName,
    date: booking.date,
    times: booking.times,
    slotRange: booking.slotRange,
    totalAmountBdt: booking.totalAmountBdt,
    payableAmountBdt: booking.payableAmountBdt,
    paymentMode: booking.paymentMode,
    customerEmail: booking.customerEmail,
    customerPhone: booking.customerPhone,
    paymentStatus: booking.paymentStatus,
    transactionId: booking.transactionId,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
}
