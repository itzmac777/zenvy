import mongoose, { Schema, type Model, type Types } from "mongoose";

const { model, models } = mongoose;

export type FieldStatus = "DRAFT" | "PUBLISHED" | "PAUSED" | "ARCHIVED";
export type PricingMode = "SAME_ALL_DAY" | "DAY_NIGHT" | "CUSTOM";
export type BookingStatus = "PENDING_PAYMENT" | "CONFIRMED" | "CANCELLED" | "EXPIRED";
export type BookingSource = "PUBLIC" | "MANAGER";
export type PaymentMode = "ADVANCE" | "FULL" | "MANUAL";
export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
export type OccupancyKind = "HOLD" | "BOOKING" | "BLOCK";

export interface ManagerUserRecord {
  phone: string;
  name?: string | null;
  status: "ACTIVE" | "SUSPENDED";
  onboardedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OtpChallengeRecord {
  phone: string;
  codeHash: string;
  requestIp?: string | null;
  attempts: number;
  expiresAt: Date;
  consumedAt?: Date | null;
  invitationId?: Types.ObjectId | null;
  createdAt: Date;
}

export interface ManagerInvitationRecord {
  codeHash: string;
  phone?: string | null;
  expiresAt?: Date | null;
  maxUses: number;
  uses: number;
  active: boolean;
  createdAt: Date;
}

export interface SessionRecord {
  tokenHash: string;
  userId: Types.ObjectId;
  expiresAt: Date;
  lastSeenAt: Date;
  createdAt: Date;
}

export interface FieldImageRecord {
  _id?: Types.ObjectId;
  url: string;
  alt: string;
  position: number;
  isCover: boolean;
}

export interface WeeklyHoursRecord {
  dayOfWeek: number;
  isClosed: boolean;
  opensAt: string;
  closesAt: string;
}

export interface PricingRuleRecord {
  _id?: Types.ObjectId;
  dayOfWeek: number;
  startTime: string;
  priceBdt: number;
}

export interface FieldRecord {
  ownerId: Types.ObjectId;
  name: string;
  slug: string;
  code: string;
  address: string;
  area: string;
  city: string;
  contactPhone: string;
  format: string;
  description: string;
  capacity: number;
  surface: string;
  lengthM?: number | null;
  widthM?: number | null;
  heightM?: number | null;
  amenities: string[];
  status: FieldStatus;
  featured: boolean;
  bookingWindowDays: number;
  minLeadMinutes: number;
  reschedulePolicy: string;
  baseRateBdt: number;
  pricingMode: PricingMode;
  dayStart: string;
  nightStart: string;
  dayRateBdt?: number | null;
  nightRateBdt?: number | null;
  images: FieldImageRecord[];
  weeklyHours: WeeklyHoursRecord[];
  pricingRules: PricingRuleRecord[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SlotOverrideRecord {
  fieldId: Types.ObjectId;
  startAt: Date;
  priceBdt?: number | null;
  availability: "DEFAULT" | "OPEN" | "CLOSED";
  reason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingSlotRecord {
  _id?: Types.ObjectId;
  startAt: Date;
  endAt: Date;
  priceBdt: number;
}

export interface PaymentRecord {
  _id?: Types.ObjectId;
  provider: string;
  transactionId?: string | null;
  amountBdt: number;
  status: PaymentStatus;
  method?: string | null;
  rawPayload?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingRecord {
  invoiceNumber: string;
  fieldId: Types.ObjectId;
  ownerId: Types.ObjectId;
  source: BookingSource;
  status: BookingStatus;
  paymentMode: PaymentMode;
  customerPhone: string;
  customerName?: string | null;
  customerEmail?: string | null;
  notes?: string | null;
  totalAmountBdt: number;
  payableAmountBdt: number;
  paidAmountBdt: number;
  refundRequired: boolean;
  createdById?: Types.ObjectId | null;
  holdExpiresAt?: Date | null;
  slots: BookingSlotRecord[];
  payments: PaymentRecord[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SlotBlockRecord {
  fieldId: Types.ObjectId;
  ownerId: Types.ObjectId;
  reason: string;
  note?: string | null;
  createdById: Types.ObjectId;
  active: boolean;
  cancelledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SlotOccupancyRecord {
  fieldId: Types.ObjectId;
  startAt: Date;
  endAt: Date;
  kind: OccupancyKind;
  bookingId?: Types.ObjectId | null;
  blockId?: Types.ObjectId | null;
  expiresAt?: Date | null;
  createdAt: Date;
}

export interface AuditLogRecord {
  ownerId: Types.ObjectId;
  userId?: Types.ObjectId | null;
  entityType: string;
  entityId: string;
  action: string;
  metadata?: unknown;
  createdAt: Date;
}

const weeklyHoursSchema = new Schema<WeeklyHoursRecord>({
  dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
  isClosed: { type: Boolean, default: false },
  opensAt: { type: String, required: true },
  closesAt: { type: String, required: true },
}, { _id: false });

const pricingRuleSchema = new Schema<PricingRuleRecord>({
  dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
  startTime: { type: String, required: true },
  priceBdt: { type: Number, required: true, min: 1 },
});

const imageSchema = new Schema<FieldImageRecord>({
  url: { type: String, required: true },
  alt: { type: String, required: true },
  position: { type: Number, default: 0 },
  isCover: { type: Boolean, default: false },
});

const bookingSlotSchema = new Schema<BookingSlotRecord>({
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  priceBdt: { type: Number, required: true, min: 1 },
});

const paymentSchema = new Schema<PaymentRecord>({
  provider: { type: String, required: true },
  transactionId: { type: String, default: null },
  amountBdt: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ["PENDING", "SUCCESS", "FAILED", "REFUNDED"], required: true },
  method: { type: String, default: null },
  rawPayload: { type: Schema.Types.Mixed },
}, { timestamps: true });

const managerUserSchema = new Schema<ManagerUserRecord>({
  phone: { type: String, required: true, unique: true, index: true },
  name: { type: String, default: null },
  status: { type: String, enum: ["ACTIVE", "SUSPENDED"], default: "ACTIVE" },
  onboardedAt: { type: Date, default: null },
}, { timestamps: true });

const otpChallengeSchema = new Schema<OtpChallengeRecord>({
  phone: { type: String, required: true, index: true },
  codeHash: { type: String, required: true },
  requestIp: { type: String, default: null },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
  consumedAt: { type: Date, default: null },
  invitationId: { type: Schema.Types.ObjectId, default: null },
}, { timestamps: { createdAt: true, updatedAt: false } });

const managerInvitationSchema = new Schema<ManagerInvitationRecord>({
  codeHash: { type: String, required: true, unique: true },
  phone: { type: String, default: null },
  expiresAt: { type: Date, default: null },
  maxUses: { type: Number, default: 1 },
  uses: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

const sessionSchema = new Schema<SessionRecord>({
  tokenHash: { type: String, required: true, unique: true, index: true },
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  expiresAt: { type: Date, required: true },
  lastSeenAt: { type: Date, default: Date.now },
}, { timestamps: { createdAt: true, updatedAt: false } });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const fieldSchema = new Schema<FieldRecord>({
  ownerId: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  code: { type: String, required: true },
  address: { type: String, required: true },
  area: { type: String, required: true },
  city: { type: String, required: true, default: "Dhaka" },
  contactPhone: { type: String, required: true },
  format: { type: String, required: true },
  description: { type: String, required: true },
  capacity: { type: Number, required: true },
  surface: { type: String, required: true },
  lengthM: { type: Number, default: null },
  widthM: { type: Number, default: null },
  heightM: { type: Number, default: null },
  amenities: { type: [String], default: [] },
  status: { type: String, enum: ["DRAFT", "PUBLISHED", "PAUSED", "ARCHIVED"], default: "DRAFT" },
  featured: { type: Boolean, default: false },
  bookingWindowDays: { type: Number, default: 30 },
  minLeadMinutes: { type: Number, default: 60 },
  reschedulePolicy: { type: String, default: "Free reschedule up to 12 hours before kickoff." },
  baseRateBdt: { type: Number, default: 1 },
  pricingMode: { type: String, enum: ["SAME_ALL_DAY", "DAY_NIGHT", "CUSTOM"], default: "SAME_ALL_DAY" },
  dayStart: { type: String, default: "06:00" },
  nightStart: { type: String, default: "18:00" },
  dayRateBdt: { type: Number, default: null },
  nightRateBdt: { type: Number, default: null },
  images: { type: [imageSchema], default: [] },
  weeklyHours: { type: [weeklyHoursSchema], default: [] },
  pricingRules: { type: [pricingRuleSchema], default: [] },
}, { timestamps: true });
fieldSchema.index({ ownerId: 1, code: 1 }, { unique: true });

const slotOverrideSchema = new Schema<SlotOverrideRecord>({
  fieldId: { type: Schema.Types.ObjectId, required: true, index: true },
  startAt: { type: Date, required: true },
  priceBdt: { type: Number, default: null },
  availability: { type: String, enum: ["DEFAULT", "OPEN", "CLOSED"], default: "DEFAULT" },
  reason: { type: String, default: null },
}, { timestamps: true });
slotOverrideSchema.index({ fieldId: 1, startAt: 1 }, { unique: true });

const bookingSchema = new Schema<BookingRecord>({
  invoiceNumber: { type: String, required: true, unique: true, index: true },
  fieldId: { type: Schema.Types.ObjectId, required: true, index: true },
  ownerId: { type: Schema.Types.ObjectId, required: true, index: true },
  source: { type: String, enum: ["PUBLIC", "MANAGER"], required: true },
  status: { type: String, enum: ["PENDING_PAYMENT", "CONFIRMED", "CANCELLED", "EXPIRED"], required: true },
  paymentMode: { type: String, enum: ["ADVANCE", "FULL", "MANUAL"], required: true },
  customerPhone: { type: String, required: true, index: true },
  customerName: { type: String, default: null },
  customerEmail: { type: String, default: null },
  notes: { type: String, default: null },
  totalAmountBdt: { type: Number, required: true },
  payableAmountBdt: { type: Number, required: true },
  paidAmountBdt: { type: Number, default: 0 },
  refundRequired: { type: Boolean, default: false },
  createdById: { type: Schema.Types.ObjectId, default: null },
  holdExpiresAt: { type: Date, default: null },
  slots: { type: [bookingSlotSchema], default: [] },
  payments: { type: [paymentSchema], default: [] },
}, { timestamps: true });

const slotBlockSchema = new Schema<SlotBlockRecord>({
  fieldId: { type: Schema.Types.ObjectId, required: true, index: true },
  ownerId: { type: Schema.Types.ObjectId, required: true, index: true },
  reason: { type: String, required: true },
  note: { type: String, default: null },
  createdById: { type: Schema.Types.ObjectId, required: true },
  active: { type: Boolean, default: true },
  cancelledAt: { type: Date, default: null },
}, { timestamps: true });

const slotOccupancySchema = new Schema<SlotOccupancyRecord>({
  fieldId: { type: Schema.Types.ObjectId, required: true },
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  kind: { type: String, enum: ["HOLD", "BOOKING", "BLOCK"], required: true },
  bookingId: { type: Schema.Types.ObjectId, default: null, index: true },
  blockId: { type: Schema.Types.ObjectId, default: null, index: true },
  expiresAt: { type: Date, default: null, index: true },
}, { timestamps: { createdAt: true, updatedAt: false } });
slotOccupancySchema.index({ fieldId: 1, startAt: 1 }, { unique: true });

const auditLogSchema = new Schema<AuditLogRecord>({
  ownerId: { type: Schema.Types.ObjectId, required: true, index: true },
  userId: { type: Schema.Types.ObjectId, default: null },
  entityType: { type: String, required: true },
  entityId: { type: String, required: true },
  action: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed },
}, { timestamps: { createdAt: true, updatedAt: false } });

function existingModel<T>(name: string, schema: Schema<T>) {
  return (models[name] as Model<T> | undefined) ?? model<T>(name, schema);
}

export const ManagerUserModel = existingModel("ManagerUser", managerUserSchema) as any;
export const OtpChallengeModel = existingModel("OtpChallenge", otpChallengeSchema) as any;
export const ManagerInvitationModel = existingModel("ManagerInvitation", managerInvitationSchema) as any;
export const SessionModel = existingModel("Session", sessionSchema) as any;
export const FieldModel = existingModel("Field", fieldSchema) as any;
export const SlotOverrideModel = existingModel("SlotOverride", slotOverrideSchema) as any;
export const BookingModel = existingModel("Booking", bookingSchema) as any;
export const SlotBlockModel = existingModel("SlotBlock", slotBlockSchema) as any;
export const SlotOccupancyModel = existingModel("SlotOccupancy", slotOccupancySchema) as any;
export const AuditLogModel = existingModel("AuditLog", auditLogSchema) as any;
