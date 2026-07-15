import { config } from "./config.js";

type BdBulkSmsResult = {
  status?: string;
  statusmsg?: string;
  to?: string;
};

type SmsNetBdResponse = {
  error?: number;
  msg?: string;
  data?: {
    request_id?: number;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isBdBulkSmsResult(value: unknown): value is BdBulkSmsResult {
  return isRecord(value) && "status" in value;
}

function isSmsNetBdResponse(value: unknown): value is SmsNetBdResponse {
  return isRecord(value) && "error" in value;
}

export function otpMessage(code: string) {
  return `[Zenvy] Your OTP is ${code}. Valid for 5 minutes.`;
}

export function phoneForSmsNetBd(phone: string) {
  return phone.replace(/^\+/, "");
}

async function postForm(url: string, body: URLSearchParams, providerName: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`${providerName} HTTP ${response.status}`);

    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new Error(`${providerName} returned invalid JSON.`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function sendViaSmsNetBd(phone: string, code: string) {
  if (!config.sms.smsNetBdApiKey) throw new Error("SMS.net.bd API key is not configured.");
  const body = new URLSearchParams({
    api_key: config.sms.smsNetBdApiKey,
    msg: otpMessage(code),
    to: phoneForSmsNetBd(phone),
  });
  if (config.sms.smsNetBdSenderId) body.set("sender_id", config.sms.smsNetBdSenderId);

  const payload = await postForm(config.sms.smsNetBdUrl, body, "SMS.net.bd");
  if (!isSmsNetBdResponse(payload) || payload.error !== 0) {
    const message = isSmsNetBdResponse(payload) ? payload.msg : "Unknown SMS.net.bd response.";
    throw new Error(message || "SMS.net.bd failed to send OTP.");
  }
}

async function sendViaBdBulkSms(phone: string, code: string) {
  if (!config.sms.bdBulkSmsToken) throw new Error("BD Bulk SMS token is not configured.");
  const body = new URLSearchParams({
    to: phone,
    message: otpMessage(code),
    token: config.sms.bdBulkSmsToken,
  });
  const payload = await postForm(config.sms.bdBulkSmsUrl, body, "BD Bulk SMS");
  const firstResult = Array.isArray(payload) ? payload[0] : payload;
  if (!isBdBulkSmsResult(firstResult) || firstResult.status !== "SENT") {
    const message = isBdBulkSmsResult(firstResult) ? firstResult.statusmsg : "Unknown BD Bulk SMS response.";
    throw new Error(message || "BD Bulk SMS failed to send OTP.");
  }
}

export async function sendManagerOtp(phone: string, code: string) {
  if (config.sms.provider === "development") {
    if (config.nodeEnv === "production" && !config.otpDevCode) {
      throw new Error("SMS provider is not configured.");
    }
    console.log(`[Zenvy OTP] ${phone}: ${code}`);
    return;
  }

  if (config.sms.provider === "sms_net_bd") {
    await sendViaSmsNetBd(phone, code);
    return;
  }

  if (config.sms.provider === "bd_bulk_sms") {
    await sendViaBdBulkSms(phone, code);
    return;
  }

  throw new Error(`Unsupported SMS provider: ${config.sms.provider}`);
}
