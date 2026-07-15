import { ManagerApiError } from "@/lib/manager-api";

export const simpleManagerUi = process.env.NEXT_PUBLIC_MANAGER_UI_VERSION !== "classic";

export const managerCopy = {
  today: "আজ",
  bookings: "বুকিং",
  fields: "মাঠ",
  empty: "খালি",
  booked: "বুকিং",
  due: "বাকি",
  waiting: "অপেক্ষা",
  closed: "বন্ধ",
  call: "কল",
  collect: "টাকা নিন",
  done: "শেষ",
  back: "পেছনে",
  confirm: "ঠিক আছে",
  help: "সাহায্য",
  retry: "আবার চেষ্টা",
  next: "পরের ধাপ",
  save: "সেভ",
} as const;

const managerErrors: Record<string, string> = {
  INVALID_PHONE: "নম্বরটি ঠিক নয়",
  SLOT_TAKEN: "সময়টি আর খালি নেই",
  INVALID_SLOTS: "সময়টি আবার বেছে নিন",
  FIELD_NOT_READY: "আগে মাঠের ছবি দিন",
  FIELD_NOT_FOUND: "মাঠটি পাওয়া যায়নি",
  BOOKING_NOT_FOUND: "বুকিংটি পাওয়া যায়নি",
  BOOKING_ALREADY_PAID: "সব টাকা দেওয়া হয়েছে",
  IMAGE_REQUIRED: "একটি ছবি দিন",
  OTP_EXPIRED: "কোডের সময় শেষ",
  OTP_INCORRECT: "কোডটি ঠিক নয়",
  OTP_RATE_LIMITED: "একটু পরে চেষ্টা করুন",
  OTP_ATTEMPTS_EXCEEDED: "নতুন কোড নিন",
  SMS_DELIVERY_FAILED: "কোড পাঠানো যায়নি",
  SESSION_EXPIRED: "আবার লগইন করুন",
  UNAUTHORIZED: "আবার লগইন করুন",
  NETWORK_ERROR: "ইন্টারনেট নেই",
};

export function managerErrorText(error: unknown) {
  if (error instanceof ManagerApiError) return managerErrors[error.code] ?? "কাজটি হয়নি, আবার চেষ্টা করুন";
  if (error instanceof TypeError) return managerErrors.NETWORK_ERROR;
  return "কাজটি হয়নি, আবার চেষ্টা করুন";
}

export function formatManagerTaka(value: number) {
  return `৳${new Intl.NumberFormat("en-BD", { maximumFractionDigits: 0 }).format(value)}`;
}
