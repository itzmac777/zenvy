export type QuickScheduleInput = { opensAt: string; closesAt: string; openDays: number[] };

export function defaultCapacity(format: string) {
  if (format === "6-a-side") return 12;
  if (format === "7-a-side") return 14;
  return 10;
}

export function weeklyHoursFromQuick(input: QuickScheduleInput) {
  const openDays = new Set(input.openDays);
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    isClosed: !openDays.has(dayOfWeek),
    opensAt: input.opensAt,
    closesAt: input.closesAt,
  }));
}
