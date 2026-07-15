import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverRoot = resolve(__dirname, "..");

dotenv.config({
  path: [resolve(serverRoot, ".env"), resolve(serverRoot, ".env.example")],
});

const paystationPassword = process.env.PAYSTATION_PASSWORD ?? "dummy-paystation-password";
const paystationMockFlag = process.env.PAYSTATION_MOCK?.toLowerCase();
const hasRealPaystationPassword = paystationPassword.trim() !== "" && paystationPassword !== "dummy-paystation-password";
const serverPublicUrl = process.env.SERVER_PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? 4000}`;
const imagekitPrivateKey = process.env.IMAGEKIT_PRIVATE_KEY?.trim() ?? "";
const bdBulkSmsToken = process.env.BD_BULK_SMS_TOKEN?.trim() ?? "";

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:3000",
  mongoUri: process.env.MONGODB_URI ?? "mongodb://localhost:27017/zenvy",
  sessionCookieName: process.env.SESSION_COOKIE_NAME ?? "zenvy_manager_session",
  sessionDays: Number(process.env.SESSION_DAYS ?? 30),
  otpSecret: process.env.OTP_SECRET ?? "development-only-otp-secret",
  otpDevCode: process.env.OTP_DEV_CODE?.trim() || undefined,
  managerInvitesRequired: process.env.MANAGER_INVITES_REQUIRED === "true",
  uploadDirectory: process.env.UPLOAD_DIR ?? resolve(serverRoot, "uploads"),
  serverPublicUrl,
  imagekit: {
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY?.trim() ?? "",
    privateKey: imagekitPrivateKey,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT?.trim() ?? "",
    folder: process.env.IMAGEKIT_FIELD_FOLDER?.trim() || "/zenvy/fields",
    enabled: imagekitPrivateKey.length > 0,
  },
  paystation: {
    baseUrl: process.env.PAYSTATION_BASE_URL ?? "https://api.paystation.com.bd",
    storeId: process.env.PAYSTATION_STORE_ID ?? "2693-1775830347",
    password: paystationPassword,
    callbackUrl: process.env.PAYSTATION_CALLBACK_URL ?? "http://localhost:4000/api/payments/paystation/callback",
    mock: paystationMockFlag === "true" || (paystationMockFlag !== "false" && !hasRealPaystationPassword),
  },
  sms: {
    provider: bdBulkSmsToken ? "bd-bulk-sms" : "development",
    bdBulkSmsToken,
    bdBulkSmsUrl: process.env.BD_BULK_SMS_URL?.trim() || "https://api.bdbulksms.net/api.php?json",
    enabled: bdBulkSmsToken.length > 0,
  },
};
