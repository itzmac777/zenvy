import { config } from "./config.js";

export type PaymentMode = "advance" | "full";

export type PaymentRequest = {
  invoiceNumber: string;
  turfName: string;
  date: string;
  slotRange: string;
  totalAmountBdt: number;
  payableAmountBdt: number;
  paymentMode: PaymentMode;
  customerEmail: string;
  customerPhone: string;
};

type PayStationResponse = {
  status_code?: string;
  status?: string;
  message?: string;
  payment_amount?: string;
  invoice_number?: string;
  payment_url?: string;
};

export const supportedPaymentMethods = ["Bank cards", "bKash", "Nagad", "Rocket", "Upay"] as const;

export async function initiatePayStationPayment(payment: PaymentRequest) {
  if (config.paystation.mock) {
    return {
      provider: "paystation",
      status: "success",
      message: "Mock PayStation checkout created with dummy credentials.",
      invoiceNumber: payment.invoiceNumber,
      payableAmountBdt: payment.payableAmountBdt,
      paymentUrl: `${config.clientOrigin}/booking/success?invoice=${encodeURIComponent(payment.invoiceNumber)}&status=success&transaction=mock-payment`,
      supportedPaymentMethods,
      mock: true,
    };
  }

  const checkoutItems = JSON.stringify({
    turf: payment.turfName,
    date: payment.date,
    slots: payment.slotRange,
    paymentMode: payment.paymentMode,
    totalAmountBdt: payment.totalAmountBdt,
  });

  const payload = new URLSearchParams({
    merchantId: config.paystation.storeId,
    password: config.paystation.password,
    invoice_number: payment.invoiceNumber,
    currency: "BDT",
    payment_amount: String(payment.payableAmountBdt),
    pay_with_charge: "1",
    reference: `Zenvy ${payment.paymentMode} booking`,
    cust_name: "Zenvy player",
    cust_phone: payment.customerPhone,
    cust_email: payment.customerEmail,
    cust_address: "Bangladesh",
    callback_url: config.paystation.callbackUrl,
    checkout_items: checkoutItems,
    opt_a: checkoutItems,
  });

  const response = await fetch(`${config.paystation.baseUrl}/initiate-payment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: payload,
  });

  const data = (await response.json()) as PayStationResponse;

  if (!response.ok || data.status_code !== "200" || !data.payment_url) {
    throw new Error(data.message ?? "Unable to create PayStation checkout.");
  }

  return {
    provider: "paystation",
    status: data.status ?? "success",
    message: data.message ?? "Payment Link Created Successfully.",
    invoiceNumber: data.invoice_number ?? payment.invoiceNumber,
    payableAmountBdt: Number(data.payment_amount ?? payment.payableAmountBdt),
    paymentUrl: data.payment_url,
    supportedPaymentMethods,
    mock: false,
  };
}
