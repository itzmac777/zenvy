import { createHash, createHmac, randomInt } from "node:crypto";
import { config } from "./config.js";

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || `field-${Date.now()}`;
}

export function normalizeBangladeshPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (/^8801\d{9}$/.test(digits)) return `+${digits}`;
  if (/^01\d{9}$/.test(digits)) return `+88${digits}`;
  if (/^1\d{9}$/.test(digits)) return `+880${digits}`;
  return null;
}

export function maskPhone(phone: string) {
  return `${phone.slice(0, 6)}••••${phone.slice(-3)}`;
}

export function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function hashOtp(phone: string, code: string) {
  return createHmac("sha256", config.otpSecret).update(`${phone}:${code}`).digest("hex");
}

export function hashInvitation(code: string) {
  return createHmac("sha256", config.otpSecret).update(`invitation:${code.trim().toUpperCase()}`).digest("hex");
}

export function makeOtp() {
  return String(randomInt(100000, 1000000));
}

export function makeInvoiceNumber(prefix = "ZV") {
  return `${prefix}${Date.now()}${randomInt(1000, 10000)}`;
}

export function dateKeyInDhaka(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function formatTimeInDhaka(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(value);
}

export function parseDhakaDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00+06:00`);
}

export function minutesFromTime(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

export function timeFromMinutes(totalMinutes: number) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function isValidDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00+06:00`).getTime());
}
