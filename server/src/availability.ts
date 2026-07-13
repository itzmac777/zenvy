import { isValidObjectId } from "mongoose";
import {
  BookingModel,
  FieldModel,
  SlotBlockModel,
  SlotOccupancyModel,
  SlotOverrideModel,
  type BookingRecord,
  type FieldRecord,
  type SlotBlockRecord,
  type SlotOccupancyRecord,
  type SlotOverrideRecord,
} from "./models.js";
import { dateKeyInDhaka, formatTimeInDhaka, isValidDateKey, minutesFromTime, timeFromMinutes } from "./utils.js";

export type AvailabilityStatus = "AVAILABLE" | "HELD" | "BOOKED" | "MANUAL_BOOKED" | "BLOCKED" | "CLOSED";
type FieldLike = FieldRecord & { _id: unknown };
type OccupancyLike = SlotOccupancyRecord & { _id: unknown };
type BookingLike = BookingRecord & { _id: unknown };
type BlockLike = SlotBlockRecord & { _id: unknown };
type OverrideLike = SlotOverrideRecord & { _id: unknown };

function addDays(dateKey: string, amount: number) {
  const date = new Date(`${dateKey}T12:00:00+06:00`);
  date.setUTCDate(date.getUTCDate() + amount);
  return dateKeyInDhaka(date);
}

function eachDate(from: string, to: string) {
  const dates: string[] = [];
  let cursor = from;
  while (cursor <= to && dates.length < 62) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}

function localDayOfWeek(dateKey: string) {
  return new Date(`${dateKey}T12:00:00+06:00`).getUTCDay();
}

function minuteOfDay(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0) % 24;
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

export function resolvePrice(field: FieldLike, startAt: Date, overridePrice?: number | null) {
  if (overridePrice != null) return overridePrice;
  const dateKey = dateKeyInDhaka(startAt);
  const dayOfWeek = localDayOfWeek(dateKey);
  const time = timeFromMinutes(minuteOfDay(startAt));
  if (field.pricingMode === "CUSTOM") {
    return field.pricingRules.find((rule) => rule.dayOfWeek === dayOfWeek && rule.startTime === time)?.priceBdt ?? field.baseRateBdt;
  }
  if (field.pricingMode === "DAY_NIGHT") {
    const minute = minuteOfDay(startAt);
    const dayStart = minutesFromTime(field.dayStart);
    const nightStart = minutesFromTime(field.nightStart);
    const isDay = dayStart <= nightStart ? minute >= dayStart && minute < nightStart : minute >= dayStart || minute < nightStart;
    return isDay ? (field.dayRateBdt ?? field.baseRateBdt) : (field.nightRateBdt ?? field.baseRateBdt);
  }
  return field.baseRateBdt;
}

function occupancyStatus(occupancy: OccupancyLike, booking?: BookingLike): AvailabilityStatus {
  if (occupancy.kind === "HOLD") return "HELD";
  if (occupancy.kind === "BLOCK") return "BLOCKED";
  return booking?.source === "MANAGER" ? "MANUAL_BOOKED" : "BOOKED";
}

export async function cleanupExpiredHolds() {
  const expired = await SlotOccupancyModel.find({ kind: "HOLD", expiresAt: { $lte: new Date() } }).select("bookingId").lean();
  const bookingIds = [...new Set((expired as Array<{ bookingId?: unknown }>).map((item) => item.bookingId ? String(item.bookingId) : "").filter(Boolean))];
  if (!bookingIds.length) return;
  await Promise.all([
    SlotOccupancyModel.deleteMany({ kind: "HOLD", expiresAt: { $lte: new Date() } }),
    BookingModel.updateMany({ _id: { $in: bookingIds }, status: "PENDING_PAYMENT" }, { $set: { status: "EXPIRED" } }),
    BookingModel.updateMany(
      { _id: { $in: bookingIds } },
      { $set: { "payments.$[payment].status": "FAILED" } },
      { arrayFilters: [{ "payment.status": "PENDING" }] },
    ),
  ]);
}

export async function buildAvailability(fieldId: string, from: string, to: string, managerView = false) {
  if (!isValidObjectId(fieldId)) return null;
  if (!isValidDateKey(from) || !isValidDateKey(to) || from > to) throw new Error("Invalid availability date range.");
  if (eachDate(from, to).length > 31) throw new Error("Availability ranges are limited to 31 days.");
  await cleanupExpiredHolds();

  const rangeStart = new Date(`${from}T00:00:00+06:00`);
  const rangeEnd = new Date(`${addDays(to, 2)}T00:00:00+06:00`);
  const [field, overrides, occupancies] = await Promise.all([
    FieldModel.findById(fieldId).lean() as Promise<FieldLike | null>,
    SlotOverrideModel.find({ fieldId, startAt: { $gte: rangeStart, $lt: rangeEnd } }).lean() as Promise<OverrideLike[]>,
    SlotOccupancyModel.find({ fieldId, startAt: { $gte: rangeStart, $lt: rangeEnd } }).lean() as Promise<OccupancyLike[]>,
  ]);
  if (!field) return null;

  const bookingIds = occupancies.map((item) => item.bookingId).filter(Boolean);
  const blockIds = occupancies.map((item) => item.blockId).filter(Boolean);
  const [bookings, blocks] = await Promise.all([
    BookingModel.find({ _id: { $in: bookingIds } }).lean() as Promise<BookingLike[]>,
    SlotBlockModel.find({ _id: { $in: blockIds } }).lean() as Promise<BlockLike[]>,
  ]);
  const bookingById = new Map(bookings.map((booking) => [String(booking._id), booking]));
  const blockById = new Map(blocks.map((block) => [String(block._id), block]));
  const occupancyByStart = new Map(occupancies.map((occupancy) => [occupancy.startAt.toISOString(), occupancy]));
  const overrideByStart = new Map(overrides.map((override) => [override.startAt.toISOString(), override]));
  const now = new Date();
  const minimumStart = new Date(now.getTime() + field.minLeadMinutes * 60_000);
  const horizon = new Date(now.getTime() + field.bookingWindowDays * 24 * 60 * 60_000);

  const days = eachDate(from, to).map((date) => {
    const schedule = field.weeklyHours.find((hours) => hours.dayOfWeek === localDayOfWeek(date));
    if (!schedule || schedule.isClosed) return { date, slots: [] };
    const opens = minutesFromTime(schedule.opensAt);
    let closes = minutesFromTime(schedule.closesAt);
    if (closes <= opens) closes += 1440;
    const midnight = new Date(`${date}T00:00:00+06:00`).getTime();
    const slots = [];

    for (let minute = opens; minute + 60 <= closes; minute += 60) {
      const startAt = new Date(midnight + minute * 60_000);
      const endAt = new Date(startAt.getTime() + 60 * 60_000);
      const key = startAt.toISOString();
      const occupancy = occupancyByStart.get(key);
      const override = overrideByStart.get(key);
      const booking = occupancy?.bookingId ? bookingById.get(String(occupancy.bookingId)) : undefined;
      const block = occupancy?.blockId ? blockById.get(String(occupancy.blockId)) : undefined;
      const outsideBookingWindow = startAt < minimumStart || startAt > horizon;
      const status: AvailabilityStatus = occupancy
        ? occupancyStatus(occupancy, booking)
        : override?.availability === "CLOSED" || outsideBookingWindow ? "CLOSED" : "AVAILABLE";

      slots.push({
        id: `${fieldId}:${key}`,
        startAt: key,
        endAt: endAt.toISOString(),
        time: timeFromMinutes(minute),
        label: formatTimeInDhaka(startAt),
        priceBdt: resolvePrice(field, startAt, override?.priceBdt),
        status,
        ...(managerView && occupancy ? {
          occupancy: {
            id: String(occupancy._id),
            kind: occupancy.kind,
            expiresAt: occupancy.expiresAt?.toISOString() ?? null,
            booking: booking ? {
              id: String(booking._id),
              invoiceNumber: booking.invoiceNumber,
              source: booking.source,
              status: booking.status,
              customerPhone: booking.customerPhone,
              customerName: booking.customerName ?? null,
              customerEmail: booking.customerEmail ?? null,
              totalAmountBdt: booking.totalAmountBdt,
              paidAmountBdt: booking.paidAmountBdt,
              balanceAmountBdt: Math.max(0, booking.totalAmountBdt - booking.paidAmountBdt),
              notes: booking.notes ?? null,
            } : null,
            block: block ? { id: String(block._id), reason: block.reason, note: block.note ?? null } : null,
          },
        } : {}),
      });
    }
    return { date, slots };
  });

  return {
    field: { id: String(field._id), name: field.name, slug: field.slug, status: field.status, baseRateBdt: field.baseRateBdt, pricingMode: field.pricingMode },
    days,
  };
}

export async function resolveRequestedSlots(fieldId: string, requestedStarts: string[], managerView = false) {
  const starts = [...new Set(requestedStarts)].map((value) => new Date(value)).filter((date) => !Number.isNaN(date.getTime())).sort((a, b) => a.getTime() - b.getTime());
  if (!starts.length || starts.length !== requestedStarts.length) throw new Error("Choose valid one-hour slots.");
  for (let index = 1; index < starts.length; index += 1) {
    if (starts[index].getTime() - starts[index - 1].getTime() !== 60 * 60_000) throw new Error("Selected slots must be consecutive.");
  }
  const from = dateKeyInDhaka(starts[0]);
  const to = dateKeyInDhaka(starts[starts.length - 1]);
  const availability = await buildAvailability(fieldId, from, to, managerView);
  if (!availability) throw new Error("Field not found.");
  const availableSlots = new Map(availability.days.flatMap((day) => day.slots).map((slot) => [slot.startAt, slot]));
  const resolved = starts.map((start) => availableSlots.get(start.toISOString()));
  if (resolved.some((slot) => !slot || slot.status !== "AVAILABLE")) throw new Error("One or more selected slots are no longer available.");
  return { availability, slots: resolved as Array<NonNullable<(typeof resolved)[number]>> };
}
