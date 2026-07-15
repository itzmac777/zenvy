import { describe, expect, it } from "vitest";
import { defaultCapacity, weeklyHoursFromQuick } from "./field-defaults.js";

describe("quick field defaults", () => {
  it("derives player capacity from the selected format", () => {
    expect(defaultCapacity("5-a-side")).toBe(10);
    expect(defaultCapacity("6-a-side")).toBe(12);
    expect(defaultCapacity("7-a-side")).toBe(14);
    expect(defaultCapacity("Futsal")).toBe(10);
  });

  it("creates seven authoritative operating-day records", () => {
    const hours = weeklyHoursFromQuick({ opensAt: "08:00", closesAt: "23:00", openDays: [1, 2, 3, 4, 5] });
    expect(hours).toHaveLength(7);
    expect(hours[0]).toEqual({ dayOfWeek: 0, isClosed: true, opensAt: "08:00", closesAt: "23:00" });
    expect(hours[1].isClosed).toBe(false);
    expect(hours[6].isClosed).toBe(true);
  });
});
