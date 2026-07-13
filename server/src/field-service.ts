import { BookingModel, FieldModel, type BookingRecord, type FieldRecord } from "./models.js";
import { normalizeMediaUrl } from "./media-storage.js";

type FieldLike = FieldRecord & { _id: unknown };
type BookingLike = BookingRecord & { _id: unknown };

function priceRange(field: FieldLike) {
  const prices = [field.baseRateBdt];
  if (field.dayRateBdt != null) prices.push(field.dayRateBdt);
  if (field.nightRateBdt != null) prices.push(field.nightRateBdt);
  prices.push(...field.pricingRules.map((rule) => rule.priceBdt));
  return { minimum: Math.min(...prices), maximum: Math.max(...prices) };
}

function openingHours(field: FieldLike) {
  const openDays = field.weeklyHours.filter((day) => !day.isClosed);
  if (!openDays.length) return "Closed";
  const signatures = [...new Set(openDays.map((day) => `${day.opensAt}-${day.closesAt}`))];
  return signatures.length === 1 ? `${openDays[0].opensAt} - ${openDays[0].closesAt}` : "Hours vary by day";
}

export function serializeField(field: FieldLike) {
  const prices = priceRange(field);
  const cover = field.images.find((image) => image.isCover) ?? field.images[0];
  const images = field.images.map((image) => ({ ...image, url: normalizeMediaUrl(image.url) }));
  const coverUrl = cover?.url ? normalizeMediaUrl(cover.url) : null;
  return {
    id: String(field._id),
    name: field.name,
    slug: field.slug,
    code: field.code,
    status: field.status,
    address: field.address,
    area: field.area,
    city: field.city,
    contactPhone: field.contactPhone,
    format: field.format,
    description: field.description,
    capacity: field.capacity,
    surface: field.surface,
    dimensions: { lengthM: field.lengthM ?? null, widthM: field.widthM ?? null, heightM: field.heightM ?? null },
    amenities: field.amenities,
    featured: field.featured,
    bookingWindowDays: field.bookingWindowDays,
    minLeadMinutes: field.minLeadMinutes,
    reschedulePolicy: field.reschedulePolicy,
    pricing: {
      mode: field.pricingMode,
      baseRateBdt: field.baseRateBdt,
      dayStart: field.dayStart,
      nightStart: field.nightStart,
      dayRateBdt: field.dayRateBdt ?? null,
      nightRateBdt: field.nightRateBdt ?? null,
      minimumRateBdt: prices.minimum,
      maximumRateBdt: prices.maximum,
      rules: field.pricingRules.map((rule) => ({ id: rule._id ? String(rule._id) : undefined, dayOfWeek: rule.dayOfWeek, startTime: rule.startTime, priceBdt: rule.priceBdt })),
    },
    weeklyHours: field.weeklyHours.map((day) => ({ dayOfWeek: day.dayOfWeek, isClosed: day.isClosed, opensAt: day.opensAt, closesAt: day.closesAt })),
    openingHours: openingHours(field),
    images: images.map((image) => ({ id: image._id ? String(image._id) : undefined, url: image.url, alt: image.alt, isCover: image.isCover, position: image.position })),
    image: coverUrl,
    alt: cover?.alt ?? field.name,
    location: `${field.area}, ${field.city}`,
    locationDetails: { address: field.address, area: field.area, city: field.city, contactPhone: field.contactPhone },
    price: prices.minimum === prices.maximum ? `BDT ${prices.minimum}/hr` : `BDT ${prices.minimum}-${prices.maximum}/hr`,
    hourlyRate: prices.minimum,
    terms: `${field.bookingWindowDays} days ahead`,
    rating: 4.8,
    ratingCount: 0,
    pitchSize: field.lengthM && field.widthM ? `${field.lengthM} x ${field.widthM} m` : "Size pending",
  };
}

export async function getFieldDetail(idOrSlug: string) {
  const conditions = [{ slug: idOrSlug }] as Array<Record<string, string>>;
  if (/^[a-f\d]{24}$/i.test(idOrSlug)) conditions.unshift({ _id: idOrSlug });
  const field = await FieldModel.findOne({ $or: conditions }).lean();
  return field as (FieldLike | null);
}

export async function listPublicFields() {
  const fields = await FieldModel.find({ status: "PUBLISHED" }).sort({ featured: -1, createdAt: 1 }).lean();
  return (fields as FieldLike[]).map(serializeField);
}

export function serializeBooking(booking: BookingLike, field: FieldLike) {
  const sortedSlots = [...booking.slots].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  const first = sortedSlots[0];
  const last = sortedSlots[sortedSlots.length - 1];
  return {
    id: String(booking._id),
    invoiceNumber: booking.invoiceNumber,
    fieldId: String(booking.fieldId),
    turfId: String(booking.fieldId),
    fieldName: field.name,
    turfName: field.name,
    venueName: field.area,
    source: booking.source,
    status: booking.status,
    paymentStatus: booking.status === "CONFIRMED" ? "success" : booking.status.toLowerCase(),
    paymentMode: booking.paymentMode.toLowerCase(),
    customerPhone: booking.customerPhone,
    customerName: booking.customerName ?? null,
    customerEmail: booking.customerEmail ?? null,
    notes: booking.notes ?? null,
    totalAmountBdt: booking.totalAmountBdt,
    payableAmountBdt: booking.payableAmountBdt,
    paidAmountBdt: booking.paidAmountBdt,
    balanceAmountBdt: Math.max(0, booking.totalAmountBdt - booking.paidAmountBdt),
    refundRequired: booking.refundRequired,
    slots: sortedSlots.map((slot) => ({ id: slot._id ? String(slot._id) : `${slot.startAt.toISOString()}`, startAt: slot.startAt.toISOString(), endAt: slot.endAt.toISOString(), priceBdt: slot.priceBdt })),
    times: sortedSlots.map((slot) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit", hour12: false }).format(slot.startAt)),
    date: first ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(first.startAt) : "",
    slotRange: first && last ? `${new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dhaka", hour: "numeric", minute: "2-digit" }).format(first.startAt)} - ${new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dhaka", hour: "numeric", minute: "2-digit" }).format(last.endAt)}` : "",
    payments: booking.payments.map((payment) => ({ id: payment._id ? String(payment._id) : undefined, provider: payment.provider, amountBdt: payment.amountBdt, status: payment.status, method: payment.method ?? null, transactionId: payment.transactionId ?? null, createdAt: payment.createdAt.toISOString() })),
    transactionId: booking.payments.find((payment) => payment.transactionId)?.transactionId ?? undefined,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
  };
}

export async function getSerializedBooking(bookingId: string) {
  const booking = await BookingModel.findById(bookingId).lean() as BookingLike | null;
  if (!booking) return null;
  const field = await FieldModel.findById(booking.fieldId).lean() as FieldLike | null;
  return field ? serializeBooking(booking, field) : null;
}
