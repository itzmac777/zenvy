import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type NextFunction, type Request, type RequestHandler, type Response } from "express";
import multer from "multer";
import { z } from "zod";
import { isValidObjectId } from "mongoose";
import {
  logoutManager,
  managerFieldIds,
  managerMe,
  managerOwnsField,
  requestOtp,
  requireManager,
  verifyOtp,
  type ManagerRequest,
} from "./auth.js";
import { buildAvailability, resolveRequestedSlots } from "./availability.js";
import { config } from "./config.js";
import { connectDatabase, databaseReady } from "./db.js";
import { getFieldDetail, listPublicFields, serializeBooking, serializeField } from "./field-service.js";
import { defaultCapacity, weeklyHoursFromQuick } from "./field-defaults.js";
import { storeFieldImage } from "./media-storage.js";
import {
  AuditLogModel,
  BookingModel,
  FieldModel,
  ManagerUserModel,
  SlotBlockModel,
  SlotOccupancyModel,
  SlotOverrideModel,
  type BookingRecord,
  type FieldRecord,
} from "./models.js";
import { initiatePayStationPayment } from "./paystation.js";
import { dateKeyInDhaka, makeInvoiceNumber, normalizeBangladeshPhone, slugify } from "./utils.js";

type FieldLike = FieldRecord & { _id: unknown };
type BookingLike = BookingRecord & { _id: unknown };

const app = express();
const asyncRoute = (handler: (request: Request, response: Response, next: NextFunction) => Promise<void>): RequestHandler =>
  (request, response, next) => void handler(request, response, next).catch(next);
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):(00|30)$/);
const scheduleDaySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  isClosed: z.boolean(),
  opensAt: timeSchema,
  closesAt: timeSchema,
});
const pricingRuleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: timeSchema,
  priceBdt: z.number().int().min(1),
});

const fullFieldSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: z.string().trim().min(2).max(30),
  address: z.string().trim().min(5).max(300),
  area: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(100).default("Dhaka"),
  contactPhone: z.string().trim().min(8),
  format: z.string().trim().min(2).max(50),
  description: z.string().trim().min(10).max(2000),
  capacity: z.number().int().min(2).max(100),
  surface: z.string().trim().min(2).max(100),
  lengthM: z.number().positive().nullable().optional(),
  widthM: z.number().positive().nullable().optional(),
  heightM: z.number().positive().nullable().optional(),
  amenities: z.array(z.string().trim().min(1)).max(30).default([]),
  featured: z.boolean().default(false),
  bookingWindowDays: z.number().int().min(1).max(90).default(30),
  minLeadMinutes: z.number().int().min(0).max(10080).default(60),
  reschedulePolicy: z.string().trim().min(5).max(500).default("Free reschedule up to 12 hours before kickoff."),
  baseRateBdt: z.number().int().min(1).default(1),
  pricingMode: z.enum(["SAME_ALL_DAY", "DAY_NIGHT", "CUSTOM"]).default("SAME_ALL_DAY"),
  dayStart: timeSchema.default("06:00"),
  nightStart: timeSchema.default("18:00"),
  dayRateBdt: z.number().int().min(1).nullable().optional(),
  nightRateBdt: z.number().int().min(1).nullable().optional(),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
  weeklyHours: z.array(scheduleDaySchema).length(7),
  pricingRules: z.array(pricingRuleSchema).default([]),
  status: z.enum(["DRAFT", "PUBLISHED", "PAUSED", "ARCHIVED"]).default("DRAFT"),
});

const quickFieldSchema = z.object({
  name: z.string().trim().min(2).max(100),
  locationLabel: z.string().trim().min(2).max(180),
  format: z.enum(["5-a-side", "6-a-side", "7-a-side", "Futsal"]),
  opensAt: timeSchema,
  closesAt: timeSchema,
  openDays: z.array(z.number().int().min(0).max(6)).min(1).max(7)
    .refine((days) => new Set(days).size === days.length, "Open days must be unique."),
  baseRateBdt: z.number().int().min(1).max(1_000_000),
  pricingMode: z.enum(["SAME_ALL_DAY", "DAY_NIGHT"]).default("SAME_ALL_DAY"),
  dayStart: timeSchema.default("06:00"),
  nightStart: timeSchema.default("18:00"),
  dayRateBdt: z.number().int().min(1).max(1_000_000).nullable().optional(),
  nightRateBdt: z.number().int().min(1).max(1_000_000).nullable().optional(),
});

const basicFieldPatchSchema = quickFieldSchema.partial().superRefine((value, context) => {
  const scheduleValues = [value.opensAt, value.closesAt, value.openDays].filter((item) => item !== undefined);
  if (scheduleValues.length > 0 && scheduleValues.length < 3) {
    context.addIssue({ code: "custom", message: "Opening time, closing time, and open days must be updated together." });
  }
  if (value.pricingMode === "DAY_NIGHT" && (value.dayRateBdt == null || value.nightRateBdt == null)) {
    context.addIssue({ code: "custom", message: "Day and night rates are required." });
  }
});

const onboardingSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

const overrideSchema = z.object({
  fieldId: z.string().min(1),
  slotStartAts: z.array(z.string().datetime()).min(1).max(24),
  priceBdt: z.number().int().min(1).nullable().optional(),
  availability: z.enum(["DEFAULT", "OPEN", "CLOSED"]).default("DEFAULT"),
  reason: z.string().trim().max(200).optional(),
});

const manualBookingSchema = z.object({
  fieldId: z.string().min(1),
  slotStartAts: z.array(z.string().datetime()).min(1).max(12),
  customerPhone: z.string().min(8),
  customerName: z.string().trim().max(100).optional(),
  customerEmail: z.string().email().optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional(),
  paidAmountBdt: z.number().int().min(0).default(0),
  paymentMethod: z.enum(["Cash", "bKash", "Nagad", "Rocket", "Upay", "Card", "Bank", "Other"]).default("Cash"),
});

const blockSchema = z.object({
  fieldId: z.string().min(1),
  slotStartAts: z.array(z.string().datetime()).min(1).max(24),
  reason: z.enum(["Maintenance", "Private event", "Field closure", "Other"]),
  note: z.string().trim().max(500).optional(),
});

const checkoutSchema = z.object({
  fieldId: z.string().min(1),
  slotStartAts: z.array(z.string().datetime()).min(1).max(12),
  paymentMode: z.enum(["advance", "full"]),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(8),
});

mkdirSync(config.uploadDirectory, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: config.uploadDirectory,
    filename: (_request, file, callback) => callback(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 6 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => callback(null, file.mimetype.startsWith("image/")),
});

app.use(cors({ origin: config.clientOrigin, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use("/uploads", express.static(config.uploadDirectory, { maxAge: config.nodeEnv === "production" ? "30d" : 0 }));

function addHour(startAt: Date) {
  return new Date(startAt.getTime() + 60 * 60_000);
}

function fieldIdList(request: ManagerRequest) {
  return managerFieldIds(request).map((id) => String(id));
}

function sendApiError(response: Response, status: number, code: string, message: string) {
  response.status(status).json({ code, message });
}

async function managerFieldOr404(request: ManagerRequest, response: Response, fieldId: string) {
  if (!managerOwnsField(request, fieldId)) {
    sendApiError(response, 403, "UNAUTHORIZED", "You cannot manage this field.");
    return null;
  }
  const field = await FieldModel.findById(fieldId).lean() as FieldLike | null;
  if (!field) {
    sendApiError(response, 404, "FIELD_NOT_FOUND", "Field not found.");
    return null;
  }
  return field;
}

async function loadSerializedBooking(bookingId: string) {
  const booking = await BookingModel.findById(bookingId).lean() as BookingLike | null;
  if (!booking) return null;
  const field = await FieldModel.findById(booking.fieldId).lean() as FieldLike | null;
  return field ? serializeBooking(booking, field) : null;
}

async function claimSlots(input: {
  fieldId: string;
  starts: Date[];
  kind: "HOLD" | "BOOKING" | "BLOCK";
  bookingId?: unknown;
  blockId?: unknown;
  expiresAt?: Date | null;
}) {
  const occupancies = input.starts.map((startAt) => ({
    fieldId: input.fieldId,
    startAt,
    endAt: addHour(startAt),
    kind: input.kind,
    bookingId: input.bookingId ?? null,
    blockId: input.blockId ?? null,
    expiresAt: input.expiresAt ?? null,
  }));
  await SlotOccupancyModel.insertMany(occupancies, { ordered: true });
}

function parseSuccessFlag(value: unknown) {
  return ["successful", "success", "paid", "200"].includes(String(value ?? "").toLowerCase());
}

function httpError(status: number, message: string, apiCode = "REQUEST_FAILED") {
  const error = new Error(message) as Error & { status?: number; apiCode?: string };
  error.status = status;
  error.apiCode = apiCode;
  return error;
}

async function createCheckout(input: z.infer<typeof checkoutSchema>) {
  const field = await FieldModel.findById(input.fieldId).lean() as FieldLike | null;
  if (!field || field.status !== "PUBLISHED") throw httpError(404, "Field not available.", "FIELD_NOT_READY");
  const phone = normalizeBangladeshPhone(input.customerPhone);
  if (!phone) throw httpError(400, "Enter a valid Bangladesh phone number.", "INVALID_PHONE");

  const resolved = await resolveRequestedSlots(input.fieldId, input.slotStartAts);
  const totalAmountBdt = resolved.slots.reduce((sum, slot) => sum + slot.priceBdt, 0);
  const payableAmountBdt = input.paymentMode === "advance" ? Math.ceil(totalAmountBdt * 0.1) : totalAmountBdt;
  const holdExpiresAt = new Date(Date.now() + 10 * 60_000);
  const booking = await BookingModel.create({
    invoiceNumber: makeInvoiceNumber(),
    fieldId: input.fieldId,
    ownerId: field.ownerId,
    source: "PUBLIC",
    status: "PENDING_PAYMENT",
    paymentMode: input.paymentMode === "advance" ? "ADVANCE" : "FULL",
    customerPhone: phone,
    customerEmail: input.customerEmail,
    totalAmountBdt,
    payableAmountBdt,
    paidAmountBdt: 0,
    holdExpiresAt,
    slots: resolved.slots.map((slot) => ({ startAt: new Date(slot.startAt), endAt: new Date(slot.endAt), priceBdt: slot.priceBdt })),
    payments: [{ provider: "paystation", amountBdt: payableAmountBdt, status: "PENDING" }],
  });

  try {
    await claimSlots({ fieldId: input.fieldId, starts: resolved.slots.map((slot) => new Date(slot.startAt)), kind: "HOLD", bookingId: booking._id, expiresAt: holdExpiresAt });
  } catch (error) {
    await BookingModel.deleteOne({ _id: booking._id });
    throw error;
  }

  try {
    const serialized = serializeBooking(booking.toObject() as BookingLike, field);
    const payment = await initiatePayStationPayment({
      invoiceNumber: serialized.invoiceNumber,
      turfName: serialized.turfName,
      date: serialized.date,
      slotRange: serialized.slotRange,
      totalAmountBdt,
      payableAmountBdt,
      paymentMode: input.paymentMode,
      customerEmail: input.customerEmail,
      customerPhone: phone,
    });

    if (payment.mock) {
      (booking as any).status = "CONFIRMED";
      (booking as any).paidAmountBdt = payableAmountBdt;
      (booking as any).holdExpiresAt = null;
      (booking as any).payments.forEach((item: any) => { item.status = "SUCCESS"; item.transactionId = "mock-payment"; });
      await booking.save();
      await SlotOccupancyModel.updateMany({ bookingId: booking._id }, { $set: { kind: "BOOKING", expiresAt: null } });
    }

    return { booking: serializeBooking(booking.toObject() as BookingLike, field), payment };
  } catch (error) {
    await Promise.all([
      SlotOccupancyModel.deleteMany({ bookingId: booking._id }),
      BookingModel.updateOne({ _id: booking._id }, { $set: { status: "EXPIRED" } }),
    ]);
    throw error;
  }
}

app.get("/health", (_request, response) => {
  response.json({ ok: databaseReady(), service: "zenvy-server", database: databaseReady() ? "connected" : "disconnected" });
});

app.post("/api/manager/auth/otp/request", asyncRoute(requestOtp));
app.post("/api/manager/auth/otp/verify", asyncRoute(verifyOtp));
app.get("/api/manager/auth/me", asyncRoute(requireManager), managerMe);
app.post("/api/manager/auth/logout", asyncRoute(requireManager), asyncRoute(logoutManager));
app.get("/api/manager/context", asyncRoute(requireManager), managerMe);

app.post("/api/manager/onboarding", asyncRoute(requireManager), asyncRoute(async (request, response) => {
  const managerRequest = request as ManagerRequest;
  const input = onboardingSchema.parse(request.body);
  await ManagerUserModel.updateOne(
    { _id: managerRequest.manager.user._id },
    { $set: { name: input.name, onboardedAt: managerRequest.manager.user.onboardedAt ?? new Date() } },
  );
  response.status(200).json({ ok: true });
}));

app.get("/api/manager/fields", asyncRoute(requireManager), asyncRoute(async (request, response) => {
  const managerRequest = request as ManagerRequest;
  const fields = await FieldModel.find({ ownerId: managerRequest.manager.user._id, status: { $ne: "ARCHIVED" } }).sort({ createdAt: -1 }).lean() as FieldLike[];
  response.json({ fields: fields.map(serializeField) });
}));

app.post("/api/manager/fields", asyncRoute(requireManager), asyncRoute(async (request, response) => {
  const managerRequest = request as ManagerRequest;
  const isQuickCreate = typeof request.body?.locationLabel === "string" && request.body?.address == null;
  let field: Awaited<ReturnType<typeof FieldModel.create>>;
  let action = "FIELD_CREATED";

  if (isQuickCreate) {
    const input = quickFieldSchema.parse(request.body);
    const locationLabel = input.locationLabel.trim();
    field = await FieldModel.create({
      ownerId: managerRequest.manager.user._id,
      name: input.name,
      slug: `${slugify(input.name)}-${Date.now().toString(36).slice(-5)}`,
      code: `ZV-${Date.now().toString(36).slice(-6).toUpperCase()}`,
      locationLabel,
      setupLevel: "BASIC",
      needsSupportReview: true,
      address: locationLabel,
      area: locationLabel,
      city: "Bangladesh",
      contactPhone: managerRequest.manager.user.phone,
      format: input.format,
      description: `${input.name} is an indoor football field in ${locationLabel}.`,
      capacity: defaultCapacity(input.format),
      surface: "Artificial turf",
      lengthM: null,
      widthM: null,
      heightM: null,
      amenities: [],
      featured: false,
      bookingWindowDays: 30,
      minLeadMinutes: 60,
      reschedulePolicy: "Free reschedule up to 12 hours before kickoff.",
      baseRateBdt: input.baseRateBdt,
      pricingMode: input.pricingMode,
      dayStart: input.dayStart,
      nightStart: input.nightStart,
      dayRateBdt: input.pricingMode === "DAY_NIGHT" ? input.dayRateBdt ?? input.baseRateBdt : null,
      nightRateBdt: input.pricingMode === "DAY_NIGHT" ? input.nightRateBdt ?? input.baseRateBdt : null,
      status: "DRAFT",
      images: [],
      weeklyHours: weeklyHoursFromQuick(input),
      pricingRules: [],
    });
  } else {
    const input = fullFieldSchema.parse(request.body);
    const phone = normalizeBangladeshPhone(input.contactPhone);
    if (!phone) {
      sendApiError(response, 400, "INVALID_PHONE", "Enter a valid field contact number.");
      return;
    }
    field = await FieldModel.create({
      ownerId: managerRequest.manager.user._id,
      name: input.name,
      slug: `${slugify(input.name)}-${Date.now().toString().slice(-4)}`,
      code: input.code.toUpperCase(),
      locationLabel: [input.area, input.city].filter(Boolean).join(", "),
      setupLevel: "COMPLETE",
      needsSupportReview: false,
      address: input.address,
      area: input.area,
      city: input.city,
      contactPhone: phone,
      format: input.format,
      description: input.description,
      capacity: input.capacity,
      surface: input.surface,
      lengthM: input.lengthM ?? null,
      widthM: input.widthM ?? null,
      heightM: input.heightM ?? null,
      amenities: input.amenities,
      featured: input.featured,
      bookingWindowDays: input.bookingWindowDays,
      minLeadMinutes: input.minLeadMinutes,
      reschedulePolicy: input.reschedulePolicy,
      baseRateBdt: input.baseRateBdt,
      pricingMode: input.pricingMode,
      dayStart: input.dayStart,
      nightStart: input.nightStart,
      dayRateBdt: input.dayRateBdt ?? null,
      nightRateBdt: input.nightRateBdt ?? null,
      status: input.status,
      images: input.coverImageUrl ? [{ url: input.coverImageUrl, alt: input.name, isCover: true, position: 0 }] : [],
      weeklyHours: input.weeklyHours,
      pricingRules: input.pricingRules,
    });
    action = input.status === "PUBLISHED" ? "FIELD_PUBLISHED" : "FIELD_CREATED";
  }

  await AuditLogModel.create({ ownerId: managerRequest.manager.user._id, userId: managerRequest.manager.user._id, entityType: "Field", entityId: String(field._id), action });
  response.status(201).json({ field: serializeField(field.toObject() as FieldLike) });
}));

app.get("/api/manager/fields/:fieldId", asyncRoute(requireManager), asyncRoute(async (request, response) => {
  const field = await managerFieldOr404(request as ManagerRequest, response, request.params.fieldId);
  if (field) response.json({ field: serializeField(field) });
}));

app.put("/api/manager/fields/:fieldId", asyncRoute(requireManager), asyncRoute(async (request, response) => {
  const managerRequest = request as ManagerRequest;
  const existing = await managerFieldOr404(managerRequest, response, request.params.fieldId);
  if (!existing) return;
  const input = fullFieldSchema.parse(request.body);
  const phone = normalizeBangladeshPhone(input.contactPhone);
  if (!phone) {
    response.status(400).json({ message: "Enter a valid field contact number." });
    return;
  }
  const field = await FieldModel.findByIdAndUpdate(
    request.params.fieldId,
    {
      $set: {
        name: input.name,
        code: input.code.toUpperCase(),
        locationLabel: [input.area, input.city].filter(Boolean).join(", "),
        setupLevel: "COMPLETE",
        needsSupportReview: false,
        address: input.address,
        area: input.area,
        city: input.city,
        contactPhone: phone,
        format: input.format,
        description: input.description,
        capacity: input.capacity,
        surface: input.surface,
        lengthM: input.lengthM ?? null,
        widthM: input.widthM ?? null,
        heightM: input.heightM ?? null,
        amenities: input.amenities,
        featured: input.featured,
        bookingWindowDays: input.bookingWindowDays,
        minLeadMinutes: input.minLeadMinutes,
        reschedulePolicy: input.reschedulePolicy,
        baseRateBdt: input.baseRateBdt,
        pricingMode: input.pricingMode,
        dayStart: input.dayStart,
        nightStart: input.nightStart,
        dayRateBdt: input.dayRateBdt ?? null,
        nightRateBdt: input.nightRateBdt ?? null,
        status: input.status,
        weeklyHours: input.weeklyHours,
        pricingRules: input.pricingRules,
      },
    },
    { new: true },
  ).lean() as FieldLike | null;
  await AuditLogModel.create({ ownerId: managerRequest.manager.user._id, userId: managerRequest.manager.user._id, entityType: "Field", entityId: request.params.fieldId, action: "FIELD_UPDATED" });
  response.json({ field: field ? serializeField(field) : serializeField(existing) });
}));

app.patch("/api/manager/fields/:fieldId/basic", asyncRoute(requireManager), asyncRoute(async (request, response) => {
  const managerRequest = request as ManagerRequest;
  const existing = await managerFieldOr404(managerRequest, response, request.params.fieldId);
  if (!existing) return;
  const input = basicFieldPatchSchema.parse(request.body);
  if (!Object.keys(input).length) {
    sendApiError(response, 400, "INVALID_REQUEST", "Choose something to update.");
    return;
  }

  const updates: Record<string, unknown> = { needsSupportReview: true };
  if (input.name !== undefined) updates.name = input.name;
  if (input.locationLabel !== undefined) {
    updates.locationLabel = input.locationLabel;
    updates.address = input.locationLabel;
    updates.area = input.locationLabel;
  }
  if (input.format !== undefined) {
    updates.format = input.format;
    updates.capacity = defaultCapacity(input.format);
  }
  if (input.opensAt !== undefined && input.closesAt !== undefined && input.openDays !== undefined) {
    updates.weeklyHours = weeklyHoursFromQuick({ opensAt: input.opensAt, closesAt: input.closesAt, openDays: input.openDays });
  }
  if (input.baseRateBdt !== undefined) {
    updates.baseRateBdt = input.baseRateBdt;
    updates.pricingRules = [];
  }
  if (input.pricingMode !== undefined) {
    updates.pricingMode = input.pricingMode;
    updates.pricingRules = [];
    if (input.pricingMode === "SAME_ALL_DAY") {
      updates.dayRateBdt = null;
      updates.nightRateBdt = null;
    }
  }
  if (input.dayStart !== undefined) updates.dayStart = input.dayStart;
  if (input.nightStart !== undefined) updates.nightStart = input.nightStart;
  if (input.dayRateBdt !== undefined) updates.dayRateBdt = input.dayRateBdt;
  if (input.nightRateBdt !== undefined) updates.nightRateBdt = input.nightRateBdt;

  const field = await FieldModel.findByIdAndUpdate(request.params.fieldId, { $set: updates }, { new: true }).lean() as FieldLike | null;
  await AuditLogModel.create({
    ownerId: managerRequest.manager.user._id,
    userId: managerRequest.manager.user._id,
    entityType: "Field",
    entityId: request.params.fieldId,
    action: "FIELD_BASIC_UPDATED",
    metadata: { fields: Object.keys(input) },
  });
  response.json({ field: serializeField(field ?? existing) });
}));

app.patch("/api/manager/fields/:fieldId/status", asyncRoute(requireManager), asyncRoute(async (request, response) => {
  const managerRequest = request as ManagerRequest;
  const existing = await managerFieldOr404(managerRequest, response, request.params.fieldId);
  if (!existing) return;
  const status = z.enum(["DRAFT", "PUBLISHED", "PAUSED", "ARCHIVED"]).parse(request.body?.status);
  if (status === "PUBLISHED" && (existing.setupLevel ?? "COMPLETE") === "BASIC" && !(existing.images ?? []).length) {
    sendApiError(response, 400, "FIELD_NOT_READY", "Add a field photo before publishing.");
    return;
  }
  const field = await FieldModel.findByIdAndUpdate(request.params.fieldId, { $set: { status } }, { new: true }).lean() as FieldLike | null;
  await AuditLogModel.create({ ownerId: managerRequest.manager.user._id, userId: managerRequest.manager.user._id, entityType: "Field", entityId: request.params.fieldId, action: `FIELD_${status}` });
  response.json({ field: serializeField(field ?? existing) });
}));

app.post("/api/manager/fields/:fieldId/images", asyncRoute(requireManager), upload.single("image"), asyncRoute(async (request, response) => {
  const managerRequest = request as ManagerRequest;
  const field = await FieldModel.findById(request.params.fieldId);
  if (!field || !managerOwnsField(managerRequest, request.params.fieldId)) {
    sendApiError(response, 404, "FIELD_NOT_FOUND", "Field not found.");
    return;
  }
  if (!request.file) {
    sendApiError(response, 400, "IMAGE_REQUIRED", "Upload an image file.");
    return;
  }
  const isCover = String(request.body?.isCover ?? "false") === "true";
  const images = (field as any).images as Array<Record<string, unknown>>;
  if (isCover) images.forEach((image) => { image.isCover = false; });
  const stored = await storeFieldImage(request.file, field.slug || String(field._id));
  const image = { url: stored.url, alt: String(request.body?.alt ?? field.name), isCover: isCover || images.length === 0, position: images.length };
  images.push(image);
  (field as any).needsSupportReview = true;
  await field.save();
  response.status(201).json({ image });
}));

app.get("/api/manager/availability", asyncRoute(requireManager), asyncRoute(async (request, response) => {
  const managerRequest = request as ManagerRequest;
  const fieldId = String(request.query.fieldId ?? "");
  if (!managerOwnsField(managerRequest, fieldId)) {
    sendApiError(response, 403, "UNAUTHORIZED", "You cannot view this field.");
    return;
  }
  const data = await buildAvailability(fieldId, String(request.query.from ?? dateKeyInDhaka(new Date())), String(request.query.to ?? dateKeyInDhaka(new Date())), true);
  response.json(data);
}));

app.post("/api/manager/slot-overrides", asyncRoute(requireManager), asyncRoute(async (request, response) => {
  const managerRequest = request as ManagerRequest;
  const input = overrideSchema.parse(request.body);
  if (!managerOwnsField(managerRequest, input.fieldId)) {
    sendApiError(response, 403, "UNAUTHORIZED", "You cannot edit this field.");
    return;
  }
  const starts = input.slotStartAts.map((value) => new Date(value));
  const overrides = [];
  for (const startAt of starts) {
    overrides.push(await SlotOverrideModel.findOneAndUpdate(
      { fieldId: input.fieldId, startAt },
      { $set: { priceBdt: input.priceBdt ?? null, availability: input.availability, reason: input.reason ?? null } },
      { upsert: true, new: true },
    ).lean());
  }
  await AuditLogModel.create({ ownerId: managerRequest.manager.user._id, userId: managerRequest.manager.user._id, entityType: "Field", entityId: input.fieldId, action: "SLOT_OVERRIDE_SET", metadata: { slotStartAts: input.slotStartAts, priceBdt: input.priceBdt, availability: input.availability } });
  response.json({ overrides });
}));

app.post("/api/manager/manual-bookings", asyncRoute(requireManager), asyncRoute(async (request, response) => {
  const managerRequest = request as ManagerRequest;
  const input = manualBookingSchema.parse(request.body);
  const field = await managerFieldOr404(managerRequest, response, input.fieldId);
  if (!field) return;
  const phone = normalizeBangladeshPhone(input.customerPhone);
  if (!phone) {
    sendApiError(response, 400, "INVALID_PHONE", "Enter a valid customer phone number.");
    return;
  }
  const resolved = await resolveRequestedSlots(input.fieldId, input.slotStartAts, true);
  const total = resolved.slots.reduce((sum, slot) => sum + slot.priceBdt, 0);
  const paidAmount = Math.min(input.paidAmountBdt, total);
  const booking = await BookingModel.create({
    invoiceNumber: makeInvoiceNumber(),
    fieldId: input.fieldId,
    ownerId: managerRequest.manager.user._id,
    source: "MANAGER",
    status: "CONFIRMED",
    paymentMode: "MANUAL",
    customerPhone: phone,
    customerName: input.customerName ?? null,
    customerEmail: input.customerEmail || null,
    notes: input.notes ?? null,
    totalAmountBdt: total,
    payableAmountBdt: total,
    paidAmountBdt: paidAmount,
    createdById: managerRequest.manager.user._id,
    slots: resolved.slots.map((slot) => ({ startAt: new Date(slot.startAt), endAt: new Date(slot.endAt), priceBdt: slot.priceBdt })),
    payments: paidAmount > 0 ? [{ provider: "manual", amountBdt: paidAmount, status: "SUCCESS", method: input.paymentMethod }] : [],
  });
  try {
    await claimSlots({ fieldId: input.fieldId, starts: resolved.slots.map((slot) => new Date(slot.startAt)), kind: "BOOKING", bookingId: booking._id });
  } catch (error) {
    await BookingModel.deleteOne({ _id: booking._id });
    throw error;
  }
  await AuditLogModel.create({ ownerId: managerRequest.manager.user._id, userId: managerRequest.manager.user._id, entityType: "Booking", entityId: String(booking._id), action: "MANUAL_BOOKING_CREATED", metadata: { invoiceNumber: booking.invoiceNumber } });
  response.status(201).json({ booking: serializeBooking(booking.toObject() as BookingLike, field) });
}));

app.post("/api/manager/blocks", asyncRoute(requireManager), asyncRoute(async (request, response) => {
  const managerRequest = request as ManagerRequest;
  const input = blockSchema.parse(request.body);
  const field = await managerFieldOr404(managerRequest, response, input.fieldId);
  if (!field) return;
  const resolved = await resolveRequestedSlots(input.fieldId, input.slotStartAts, true);
  const block = await SlotBlockModel.create({
    fieldId: input.fieldId,
    ownerId: managerRequest.manager.user._id,
    reason: input.reason,
    note: input.note ?? null,
    createdById: managerRequest.manager.user._id,
    active: true,
  });
  try {
    await claimSlots({ fieldId: input.fieldId, starts: resolved.slots.map((slot) => new Date(slot.startAt)), kind: "BLOCK", blockId: block._id });
  } catch (error) {
    await SlotBlockModel.deleteOne({ _id: block._id });
    throw error;
  }
  await AuditLogModel.create({ ownerId: managerRequest.manager.user._id, userId: managerRequest.manager.user._id, entityType: "SlotBlock", entityId: String(block._id), action: "SLOTS_BLOCKED" });
  response.status(201).json({ block });
}));

app.delete("/api/manager/blocks/:blockId", asyncRoute(requireManager), asyncRoute(async (request, response) => {
  const managerRequest = request as ManagerRequest;
  const block = await SlotBlockModel.findById(request.params.blockId).lean();
  if (!block || String(block.ownerId) !== String(managerRequest.manager.user._id)) {
    sendApiError(response, 404, "BLOCK_NOT_FOUND", "Block not found.");
    return;
  }
  await Promise.all([
    SlotOccupancyModel.deleteMany({ blockId: block._id }),
    SlotBlockModel.updateOne({ _id: block._id }, { $set: { active: false, cancelledAt: new Date() } }),
    AuditLogModel.create({ ownerId: managerRequest.manager.user._id, userId: managerRequest.manager.user._id, entityType: "SlotBlock", entityId: String(block._id), action: "SLOTS_UNBLOCKED" }),
  ]);
  response.status(204).send();
}));

app.get("/api/manager/bookings", asyncRoute(requireManager), asyncRoute(async (request, response) => {
  const ids = fieldIdList(request as ManagerRequest);
  const query = String(request.query.query ?? "").trim();
  const requestedFieldId = String(request.query.fieldId ?? "");
  const requestedStatus = String(request.query.status ?? "");
  const fieldIds = requestedFieldId && ids.includes(requestedFieldId) ? [requestedFieldId] : ids;
  const find = {
    fieldId: { $in: fieldIds },
    ...(requestedStatus && ["PENDING_PAYMENT", "CONFIRMED", "CANCELLED", "EXPIRED"].includes(requestedStatus) ? { status: requestedStatus } : {}),
    ...(query ? { $or: [{ invoiceNumber: new RegExp(query, "i") }, { customerPhone: new RegExp(query.replace(/\D/g, ""), "i") }, { customerName: new RegExp(query, "i") }] } : {}),
  };
  const bookings = await BookingModel.find(find).sort({ createdAt: -1 }).limit(80).lean() as BookingLike[];
  const fields = await FieldModel.find({ _id: { $in: [...new Set(bookings.map((booking) => String(booking.fieldId)))] } }).lean() as FieldLike[];
  const fieldById = new Map(fields.map((field) => [String(field._id), field]));
  response.json({ bookings: bookings.flatMap((booking) => {
    const field = fieldById.get(String(booking.fieldId));
    return field ? [serializeBooking(booking, field)] : [];
  }) });
}));

app.get("/api/manager/bookings/:bookingId", asyncRoute(requireManager), asyncRoute(async (request, response) => {
  const managerRequest = request as ManagerRequest;
  const ids = fieldIdList(managerRequest);
  const booking = await BookingModel.findOne({
    $or: [{ _id: isValidObjectId(request.params.bookingId) ? request.params.bookingId : undefined }, { invoiceNumber: request.params.bookingId }],
    fieldId: { $in: ids },
  }).lean() as BookingLike | null;
  if (!booking) {
    sendApiError(response, 404, "BOOKING_NOT_FOUND", "Booking not found.");
    return;
  }
  const field = await FieldModel.findById(booking.fieldId).lean() as FieldLike | null;
  response.json({ booking: field ? serializeBooking(booking, field) : null });
}));

app.post("/api/manager/bookings/:bookingId/cancel", asyncRoute(requireManager), asyncRoute(async (request, response) => {
  const managerRequest = request as ManagerRequest;
  const ids = fieldIdList(managerRequest);
  const booking = await BookingModel.findOne({ _id: request.params.bookingId, fieldId: { $in: ids } }).lean() as BookingLike | null;
  if (!booking) {
    sendApiError(response, 404, "BOOKING_NOT_FOUND", "Booking not found.");
    return;
  }
  await Promise.all([
    SlotOccupancyModel.deleteMany({ bookingId: booking._id }),
    BookingModel.updateOne({ _id: booking._id }, { $set: { status: "CANCELLED", refundRequired: booking.source === "PUBLIC" && booking.paidAmountBdt > 0 } }),
    AuditLogModel.create({ ownerId: managerRequest.manager.user._id, userId: managerRequest.manager.user._id, entityType: "Booking", entityId: String(booking._id), action: "BOOKING_CANCELLED" }),
  ]);
  const updated = await loadSerializedBooking(String(booking._id));
  response.json({ booking: updated });
}));

app.post("/api/manager/bookings/:bookingId/payments", asyncRoute(requireManager), asyncRoute(async (request, response) => {
  const managerRequest = request as ManagerRequest;
  const amount = z.number().int().min(1).parse(Number(request.body?.amountBdt));
  const method = z.enum(["Cash", "bKash", "Nagad", "Rocket", "Upay", "Card", "Bank", "Other"]).parse(request.body?.method ?? "Cash");
  const booking = await BookingModel.findOne({ _id: request.params.bookingId, fieldId: { $in: fieldIdList(managerRequest) } });
  if (!booking) {
    sendApiError(response, 404, "BOOKING_NOT_FOUND", "Booking not found.");
    return;
  }
  const balance = Math.max(0, (booking as any).totalAmountBdt - (booking as any).paidAmountBdt);
  if (!balance) {
    sendApiError(response, 409, "BOOKING_ALREADY_PAID", "This booking is already paid in full.");
    return;
  }
  const appliedAmount = Math.min(balance, amount);
  (booking as any).paidAmountBdt += appliedAmount;
  (booking as any).payments.push({ provider: "manual", amountBdt: appliedAmount, status: "SUCCESS", method });
  await booking.save();
  await AuditLogModel.create({ ownerId: managerRequest.manager.user._id, userId: managerRequest.manager.user._id, entityType: "Booking", entityId: String(booking._id), action: "PAYMENT_RECORDED", metadata: { amountBdt: appliedAmount, method } });
  response.json({ booking: await loadSerializedBooking(String(booking._id)) });
}));

app.post("/api/manager/bookings/:bookingId/reschedule", asyncRoute(requireManager), asyncRoute(async (request, response) => {
  const managerRequest = request as ManagerRequest;
  const booking = await BookingModel.findOne({ _id: request.params.bookingId, fieldId: { $in: fieldIdList(managerRequest) } });
  if (!booking) {
    sendApiError(response, 404, "BOOKING_NOT_FOUND", "Booking not found.");
    return;
  }
  const slotStartAts = z.array(z.string().datetime()).min(1).max(12).parse(request.body?.slotStartAts);
  const oldOccupancies = await SlotOccupancyModel.find({ bookingId: booking._id }).lean();
  await SlotOccupancyModel.deleteMany({ bookingId: booking._id });
  try {
    const resolved = await resolveRequestedSlots(String((booking as any).fieldId), slotStartAts, true);
    const total = resolved.slots.reduce((sum, slot) => sum + slot.priceBdt, 0);
    (booking as any).slots = resolved.slots.map((slot) => ({ startAt: new Date(slot.startAt), endAt: new Date(slot.endAt), priceBdt: slot.priceBdt }));
    (booking as any).totalAmountBdt = total;
    (booking as any).payableAmountBdt = (booking as any).paymentMode === "ADVANCE" ? Math.ceil(total * 0.1) : total;
    await booking.save();
    await claimSlots({ fieldId: String((booking as any).fieldId), starts: resolved.slots.map((slot) => new Date(slot.startAt)), kind: "BOOKING", bookingId: booking._id });
  } catch (error) {
    if (oldOccupancies.length) await SlotOccupancyModel.insertMany((oldOccupancies as Array<Record<string, unknown>>).map(({ _id: _oldId, ...item }) => item), { ordered: false });
    throw error;
  }
  await AuditLogModel.create({ ownerId: managerRequest.manager.user._id, userId: managerRequest.manager.user._id, entityType: "Booking", entityId: String(booking._id), action: "BOOKING_RESCHEDULED" });
  response.json({ booking: await loadSerializedBooking(String(booking._id)) });
}));

app.get("/api/manager/audit", asyncRoute(requireManager), asyncRoute(async (request, response) => {
  const logs = await AuditLogModel.find({ ownerId: (request as ManagerRequest).manager.user._id }).sort({ createdAt: -1 }).limit(50).lean();
  response.json({ logs: (logs as Array<Record<string, unknown> & { _id: unknown }>).map((log) => ({ ...log, id: String(log._id), _id: undefined })) });
}));

app.get("/api/fields", asyncRoute(async (_request, response) => {
  response.json({ fields: await listPublicFields() });
}));

app.get("/api/fields/:fieldId", asyncRoute(async (request, response) => {
  const field = await getFieldDetail(request.params.fieldId);
  if (!field || field.status !== "PUBLISHED") {
    response.status(404).json({ message: "Field not found." });
    return;
  }
  response.json({ field: serializeField(field) });
}));

app.get("/api/fields/:fieldId/availability", asyncRoute(async (request, response) => {
  const field = await getFieldDetail(request.params.fieldId);
  if (!field || field.status !== "PUBLISHED") {
    response.status(404).json({ message: "Field not found." });
    return;
  }
  const data = await buildAvailability(String(field._id), String(request.query.from ?? dateKeyInDhaka(new Date())), String(request.query.to ?? dateKeyInDhaka(new Date())));
  response.json(data);
}));

app.post("/api/checkout", asyncRoute(async (request, response) => {
  response.status(201).json(await createCheckout(checkoutSchema.parse(request.body)));
}));

app.post("/api/bookings/checkout", asyncRoute(async (request, response) => {
  const input = checkoutSchema.parse({ ...request.body, fieldId: request.body?.fieldId ?? request.body?.turfId, paymentMode: request.body?.paymentMode ?? "advance" });
  response.status(201).json(await createCheckout(input));
}));

app.get("/api/bookings/search", asyncRoute(async (request, response) => {
  const rawQuery = String(request.query.query ?? "").trim();
  const phone = request.query.phone ? normalizeBangladeshPhone(String(request.query.phone)) : normalizeBangladeshPhone(rawQuery);
  const invoice = String(request.query.invoice ?? request.query.invoiceNumber ?? (phone ? "" : rawQuery)).trim();
  if (!phone && !invoice) {
    response.status(400).json({ message: "Enter a contact number or invoice ID." });
    return;
  }
  const bookings = await BookingModel.find({
    ...(phone ? { customerPhone: phone } : {}),
    ...(invoice ? { invoiceNumber: new RegExp(escapeRegExp(invoice), "i") } : {}),
  }).sort({ createdAt: -1 }).limit(50).lean() as BookingLike[];
  const fields = await FieldModel.find({ _id: { $in: [...new Set(bookings.map((booking) => String(booking.fieldId)))] } }).lean() as FieldLike[];
  const fieldById = new Map(fields.map((field) => [String(field._id), field]));
  const serializedBookings = bookings.flatMap((booking) => {
    const field = fieldById.get(String(booking.fieldId));
    return field ? [serializeBooking(booking, field)] : [];
  });
  response.json({ bookings: serializedBookings, results: serializedBookings });
}));

app.get("/api/bookings/:invoiceNumber", asyncRoute(async (request, response) => {
  const booking = await BookingModel.findOne({ invoiceNumber: request.params.invoiceNumber }).lean() as BookingLike | null;
  if (!booking) {
    response.status(404).json({ message: "Booking not found." });
    return;
  }
  const field = await FieldModel.findById(booking.fieldId).lean() as FieldLike | null;
  response.json({ booking: field ? serializeBooking(booking, field) : null });
}));

app.get("/api/payments/paystation/callback", asyncRoute(async (request, response) => {
  const invoiceNumber = String(request.query.invoice_number ?? request.query.invoice ?? "").trim();
  const transactionId = String(request.query.trx_id ?? request.query.transaction ?? request.query.transaction_id ?? "").trim();
  const booking = invoiceNumber ? await BookingModel.findOne({ invoiceNumber }) : null;
  const success = parseSuccessFlag(request.query.status ?? request.query.status_code);
  if (booking) {
    if (success) {
      (booking as any).status = "CONFIRMED";
      (booking as any).paidAmountBdt = Math.max((booking as any).paidAmountBdt, (booking as any).payableAmountBdt);
      (booking as any).holdExpiresAt = null;
      (booking as any).payments.forEach((payment: any) => {
        if (payment.status === "PENDING") {
          payment.status = "SUCCESS";
          payment.transactionId = transactionId || payment.transactionId;
          payment.rawPayload = request.query;
        }
      });
      await booking.save();
      await SlotOccupancyModel.updateMany({ bookingId: booking._id }, { $set: { kind: "BOOKING", expiresAt: null } });
    } else if ((booking as any).status === "PENDING_PAYMENT") {
      (booking as any).status = "CANCELLED";
      (booking as any).payments.forEach((payment: any) => {
        if (payment.status === "PENDING") {
          payment.status = "FAILED";
          payment.transactionId = transactionId || payment.transactionId;
          payment.rawPayload = request.query;
        }
      });
      await booking.save();
      await SlotOccupancyModel.deleteMany({ bookingId: booking._id });
    }
  }
  const params = new URLSearchParams({ invoice: invoiceNumber, status: success ? "success" : "failed" });
  if (transactionId) params.set("transaction", transactionId);
  response.redirect(`${config.clientOrigin}/booking/success?${params.toString()}`);
}));

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  console.error(error);
  if (error instanceof z.ZodError) {
    response.status(400).json({ code: "INVALID_REQUEST", message: error.issues[0]?.message ?? "Invalid request." });
    return;
  }
  if (typeof error === "object" && error && "code" in error && (error as { code?: number }).code === 11000) {
    response.status(409).json({ code: "SLOT_TAKEN", message: "That slot or field is already taken." });
    return;
  }
  if (typeof error === "object" && error && "status" in error && typeof (error as { status?: unknown }).status === "number") {
    response.status((error as { status: number }).status).json({
      code: (error as { apiCode?: string }).apiCode ?? "REQUEST_FAILED",
      message: error instanceof Error ? error.message : "Request failed.",
    });
    return;
  }
  if (error instanceof Error && /no longer available|already taken/i.test(error.message)) {
    response.status(409).json({ code: "SLOT_TAKEN", message: error.message });
    return;
  }
  if (error instanceof Error && /valid one-hour slots|consecutive|date range/i.test(error.message)) {
    response.status(400).json({ code: "INVALID_SLOTS", message: error.message });
    return;
  }
  response.status(500).json({ code: "SERVER_ERROR", message: error instanceof Error ? error.message : "Something went wrong." });
});

connectDatabase()
  .then(() => {
    app.listen(config.port, () => {
      console.log(`Zenvy server listening on http://localhost:${config.port}`);
    });
  })
  .catch((error: unknown) => {
    console.error("Unable to connect to MongoDB", error);
    process.exit(1);
  });
