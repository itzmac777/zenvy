import { randomBytes } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { config } from "./config.js";
import {
  FieldModel,
  ManagerInvitationModel,
  ManagerUserModel,
  OtpChallengeModel,
  SessionModel,
} from "./models.js";
import { normalizeMediaUrl } from "./media-storage.js";
import { hashInvitation, hashOtp, hashToken, makeOtp, maskPhone, normalizeBangladeshPhone } from "./utils.js";

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RATE_WINDOW_MS = 15 * 60 * 1000;
const OTP_SEND_LIMIT = 3;
const OTP_ATTEMPT_LIMIT = 5;

type ManagerContext = {
  session: Record<string, unknown> & { _id: unknown; userId: unknown; lastSeenAt: Date; expiresAt: Date };
  user: Record<string, unknown> & { _id: unknown; phone: string; name?: string | null; status: string; onboardedAt?: Date | null };
  fields: Array<Record<string, unknown> & { _id: unknown; name: string; slug: string; code: string; status: string; format: string; baseRateBdt: number; images?: Array<{ url: string; isCover: boolean }> }>;
};

export type ManagerRequest = Request & { manager: ManagerContext };

function cookieOptions() {
  return {
    httpOnly: true,
    secure: config.nodeEnv === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: config.sessionDays * 24 * 60 * 60 * 1000,
  };
}

async function fieldsForOwner(ownerId: unknown) {
  return FieldModel.find({ ownerId, status: { $ne: "ARCHIVED" } })
    .sort({ createdAt: 1 })
    .select("name slug code status format baseRateBdt images")
    .lean();
}

export function serializeManagerSession(context: ManagerContext) {
  const fields = context.fields.map((field) => {
    const images = field.images ?? [];
    const cover = images.find((image) => image.isCover) ?? images[0];
    return {
      id: String(field._id),
      name: field.name,
      slug: field.slug,
      code: field.code,
      status: field.status,
      format: field.format,
      baseRateBdt: field.baseRateBdt,
      coverImage: cover?.url ? normalizeMediaUrl(cover.url) : null,
    };
  });
  const needsName = !context.user.name;
  return {
    user: {
      id: String(context.user._id),
      phone: context.user.phone,
      name: context.user.name ?? null,
      status: context.user.status,
      onboardedAt: context.user.onboardedAt ?? null,
    },
    fields,
    needsName,
    needsField: !needsName && fields.length === 0,
    needsOnboarding: needsName,
  };
}

export async function requestOtp(request: Request, response: Response) {
  const phone = normalizeBangladeshPhone(String(request.body?.phone ?? ""));
  if (!phone) {
    response.status(400).json({ message: "Enter a valid Bangladesh phone number." });
    return;
  }

  const recentSince = new Date(Date.now() - OTP_RATE_WINDOW_MS);
  const [recentPhoneRequests, recentIpRequests, existingUser] = await Promise.all([
    OtpChallengeModel.countDocuments({ phone, createdAt: { $gte: recentSince } }),
    OtpChallengeModel.countDocuments({ requestIp: request.ip, createdAt: { $gte: recentSince } }),
    ManagerUserModel.findOne({ phone }).select("_id").lean(),
  ]);
  if (recentPhoneRequests >= OTP_SEND_LIMIT || recentIpRequests >= OTP_SEND_LIMIT * 4) {
    response.status(429).json({ message: "Too many OTP requests. Try again in 15 minutes." });
    return;
  }

  let invitationId: unknown = null;
  if (!existingUser && config.managerInvitesRequired) {
    const invitationCode = String(request.body?.invitationCode ?? "").trim();
    if (!invitationCode) {
      response.status(403).json({ message: "A valid invitation code is required." });
      return;
    }
    const invitation = await ManagerInvitationModel.findOne({ codeHash: hashInvitation(invitationCode) }).lean();
    const valid = invitation
      && invitation.active
      && invitation.uses < invitation.maxUses
      && (!invitation.expiresAt || invitation.expiresAt > new Date())
      && (!invitation.phone || invitation.phone === phone);
    if (!valid || !invitation) {
      response.status(403).json({ message: "This invitation code is invalid or expired." });
      return;
    }
    invitationId = invitation._id;
  }

  const code = config.otpDevCode ?? makeOtp();
  const challenge = await OtpChallengeModel.create({
    phone,
    codeHash: hashOtp(phone, code),
    requestIp: request.ip,
    invitationId,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });
  if (config.nodeEnv !== "production") console.log(`[Zenvy OTP] ${phone}: ${code}`);

  response.json({
    challengeId: String(challenge._id),
    maskedPhone: maskPhone(phone),
    expiresInSeconds: OTP_TTL_MS / 1000,
    resendAfterSeconds: 60,
    ...(config.nodeEnv !== "production" ? { devCode: code } : {}),
  });
}

export async function verifyOtp(request: Request, response: Response) {
  const challengeId = String(request.body?.challengeId ?? "");
  const code = String(request.body?.code ?? "").trim();
  const challenge = await OtpChallengeModel.findById(challengeId);
  if (!challenge || challenge.consumedAt || challenge.expiresAt <= new Date()) {
    response.status(400).json({ message: "This OTP has expired. Request a new one." });
    return;
  }
  if (challenge.attempts >= OTP_ATTEMPT_LIMIT) {
    response.status(429).json({ message: "Too many incorrect attempts. Request a new OTP." });
    return;
  }
  if (challenge.codeHash !== hashOtp(challenge.phone, code)) {
    challenge.attempts += 1;
    await challenge.save();
    response.status(400).json({ message: "That OTP is not correct." });
    return;
  }

  let user = await ManagerUserModel.findOne({ phone: challenge.phone });
  if (!user) user = await ManagerUserModel.create({ phone: challenge.phone });
  challenge.consumedAt = new Date();
  await challenge.save();
  if (challenge.invitationId) await ManagerInvitationModel.updateOne({ _id: challenge.invitationId }, { $inc: { uses: 1 } });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + config.sessionDays * 24 * 60 * 60 * 1000);
  const session = await SessionModel.create({ tokenHash: hashToken(token), userId: user._id, expiresAt, lastSeenAt: new Date() });
  const fields = await fieldsForOwner(user._id);
  response.cookie(config.sessionCookieName, token, cookieOptions());
  response.json(serializeManagerSession({ session: session.toObject() as ManagerContext["session"], user: user.toObject() as ManagerContext["user"], fields: fields as ManagerContext["fields"] }));
}

export async function requireManager(request: Request, response: Response, next: NextFunction) {
  const token = request.cookies?.[config.sessionCookieName] as string | undefined;
  if (!token) {
    response.status(401).json({ message: "Manager login required." });
    return;
  }

  const session = await SessionModel.findOne({ tokenHash: hashToken(token) }).lean();
  if (!session || session.expiresAt <= new Date()) {
    if (session) await SessionModel.deleteOne({ _id: session._id });
    response.clearCookie(config.sessionCookieName, { path: "/" });
    response.status(401).json({ message: "Your manager session has expired." });
    return;
  }
  const user = await ManagerUserModel.findById(session.userId).lean();
  if (!user || user.status !== "ACTIVE") {
    await SessionModel.deleteOne({ _id: session._id });
    response.clearCookie(config.sessionCookieName, { path: "/" });
    response.status(401).json({ message: "Your manager account is unavailable." });
    return;
  }

  if (Date.now() - session.lastSeenAt.getTime() > 5 * 60 * 1000) {
    await SessionModel.updateOne({ _id: session._id }, { $set: { lastSeenAt: new Date() } });
  }
  const fields = await fieldsForOwner(user._id);
  (request as ManagerRequest).manager = { session: session as ManagerContext["session"], user: user as ManagerContext["user"], fields: fields as ManagerContext["fields"] };
  next();
}

export function managerMe(request: Request, response: Response) {
  response.json(serializeManagerSession((request as ManagerRequest).manager));
}

export async function logoutManager(request: Request, response: Response) {
  const token = request.cookies?.[config.sessionCookieName] as string | undefined;
  if (token) await SessionModel.deleteMany({ tokenHash: hashToken(token) });
  response.clearCookie(config.sessionCookieName, { path: "/" });
  response.status(204).send();
}

export function managerOwnsField(request: ManagerRequest, fieldId: string) {
  return request.manager.fields.some((field) => String(field._id) === fieldId);
}

export function managerFieldIds(request: ManagerRequest) {
  return request.manager.fields.map((field) => field._id);
}
