import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { connectDatabase, disconnectDatabase } from "../src/db.js";
import { BookingModel, FieldModel, SlotOccupancyModel } from "../src/models.js";
import { normalizeBangladeshPhone, parseDhakaDateTime } from "../src/utils.js";

type LegacyBooking = {
  invoiceNumber: string;
  turfId: string;
  date: string;
  times: string[];
  totalAmountBdt: number;
  payableAmountBdt: number;
  paymentMode: "advance" | "full" | "manual";
  customerEmail?: string | null;
  customerPhone: string;
  paymentStatus: string;
  transactionId?: string;
  createdAt?: string;
  updatedAt?: string;
};

const filePath = resolve("server/data/bookings.json");
const raw = await readFile(filePath, "utf8").catch(() => "[]");
const legacy = JSON.parse(raw) as LegacyBooking[];

await connectDatabase();

let imported = 0;
for (const item of legacy) {
  const exists = await BookingModel.exists({ invoiceNumber: item.invoiceNumber });
  if (exists) continue;
  const field = await FieldModel.findOne({ slug: item.turfId });
  if (!field) continue;
  const phone = normalizeBangladeshPhone(item.customerPhone);
  if (!phone) continue;
  const slots = item.times.map((time) => {
    const startAt = parseDhakaDateTime(item.date, time);
    return { startAt, endAt: new Date(startAt.getTime() + 60 * 60_000), priceBdt: 1 };
  });
  const booking = await BookingModel.create({
    invoiceNumber: item.invoiceNumber,
    fieldId: field._id,
    ownerId: field.ownerId,
    source: "PUBLIC",
    status: item.paymentStatus.toLowerCase().includes("success") ? "CONFIRMED" : "PENDING_PAYMENT",
    paymentMode: item.paymentMode.toUpperCase(),
    customerPhone: phone,
    customerEmail: item.customerEmail ?? null,
    totalAmountBdt: item.totalAmountBdt,
    payableAmountBdt: item.payableAmountBdt,
    paidAmountBdt: item.paymentStatus.toLowerCase().includes("success") ? item.payableAmountBdt : 0,
    slots,
    payments: [{
      provider: "paystation",
      amountBdt: item.payableAmountBdt,
      status: item.paymentStatus.toLowerCase().includes("success") ? "SUCCESS" : "PENDING",
      transactionId: item.transactionId ?? null,
    }],
    createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
    updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
  });
  await SlotOccupancyModel.insertMany(slots.map((slot) => ({
    fieldId: field._id,
    startAt: slot.startAt,
    endAt: slot.endAt,
    kind: "BOOKING",
    bookingId: booking._id,
  })), { ordered: false }).catch(() => null);
  imported += 1;
}

console.log(`Imported ${imported} legacy bookings.`);
await disconnectDatabase();
