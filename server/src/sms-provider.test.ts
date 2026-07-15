import { describe, expect, it } from "vitest";
import { otpMessage, phoneForSmsNetBd } from "./sms-provider.js";

describe("sms provider helpers", () => {
  it("formats the Zenvy OTP message", () => {
    expect(otpMessage("391772")).toBe("[Zenvy] Your OTP is 391772. Valid for 5 minutes.");
  });

  it("formats E.164 Bangladesh numbers for SMS.net.bd", () => {
    expect(phoneForSmsNetBd("+8801912345678")).toBe("8801912345678");
  });
});
