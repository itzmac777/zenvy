import { config } from "./config.js";

type BdBulkSmsResult = {
  status?: string;
  statusmsg?: string;
  to?: string;
};

function isBdBulkSmsResult(value: unknown): value is BdBulkSmsResult {
  return typeof value === "object" && value !== null && "status" in value;
}

function otpMessage(code: string) {
  return `Your Zenvy OTP is ${code}. It expires in 5 minutes.`;
}

export async function sendManagerOtp(phone: string, code: string) {
  if (!config.sms.enabled) {
    if (config.nodeEnv === "production" && !config.otpDevCode) {
      throw new Error("SMS provider is not configured.");
    }
    console.log(`[Zenvy OTP] ${phone}: ${code}`);
    return;
  }

  const body = new URLSearchParams({
    to: phone,
    message: otpMessage(code),
    token: config.sms.bdBulkSmsToken,
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(config.sms.bdBulkSmsUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`BD Bulk SMS HTTP ${response.status}`);

    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error("BD Bulk SMS returned invalid JSON.");
    }

    const firstResult = Array.isArray(payload) ? payload[0] : payload;
    if (!isBdBulkSmsResult(firstResult) || firstResult.status !== "SENT") {
      const message = isBdBulkSmsResult(firstResult) ? firstResult.statusmsg : "Unknown SMS provider response.";
      throw new Error(message || "BD Bulk SMS failed to send OTP.");
    }
  } finally {
    clearTimeout(timeout);
  }
}
