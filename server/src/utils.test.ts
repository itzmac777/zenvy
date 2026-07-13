import { describe, expect, it } from "vitest";
import {
  dateKeyInDhaka,
  isValidDateKey,
  maskPhone,
  minutesFromTime,
  normalizeBangladeshPhone,
  parseDhakaDateTime,
  slugify,
  timeFromMinutes,
} from "./utils.js";

describe("Bangladesh phone normalization", () => {
  it.each([
    ["01712-345678", "+8801712345678"],
    ["8801712345678", "+8801712345678"],
    ["+880 1712 345678", "+8801712345678"],
    ["1712345678", "+8801712345678"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeBangladeshPhone(input)).toBe(expected);
  });

  it("rejects non-mobile numbers", () => {
    expect(normalizeBangladeshPhone("021234567")).toBeNull();
  });

  it("masks a normalized number", () => {
    expect(maskPhone("+8801712345678")).toBe("+88017••••678");
  });
});

describe("Dhaka slot helpers", () => {
  it("round-trips half-hour slot boundaries", () => {
    expect(minutesFromTime("18:30")).toBe(1110);
    expect(timeFromMinutes(1110)).toBe("18:30");
    expect(timeFromMinutes(1470)).toBe("00:30");
  });

  it("keeps Dhaka calendar dates stable", () => {
    const slot = parseDhakaDateTime("2026-07-13", "23:30");
    expect(slot.toISOString()).toBe("2026-07-13T17:30:00.000Z");
    expect(dateKeyInDhaka(slot)).toBe("2026-07-13");
  });

  it("validates date keys", () => {
    expect(isValidDateKey("2026-07-13")).toBe(true);
    expect(isValidDateKey("13-07-2026")).toBe(false);
  });
});

describe("catalog helpers", () => {
  it("creates stable URL slugs", () => {
    expect(slugify("  Cage North 5-a-side  ")).toBe("cage-north-5-a-side");
  });
});
