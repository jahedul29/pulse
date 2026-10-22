export const PERIOD_PRESETS = ["last1h", "today", "last24h", "last7d", "thisMonth", "last30d"] as const;
export type PeriodPreset = (typeof PERIOD_PRESETS)[number];
export type PeriodRange = [number, number];

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export function periodRange(preset: PeriodPreset, now: Date = new Date()): PeriodRange {
  const end = now.getTime();
  if (preset === "last1h") return [end - HOUR, end];
  if (preset === "last24h") return [end - DAY, end];
  if (preset === "last7d") return [end - 7 * DAY, end];
  if (preset === "last30d") return [end - 30 * DAY, end];
  if (preset === "thisMonth") return [new Date(now.getFullYear(), now.getMonth(), 1).getTime(), end];
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  return [midnight.getTime(), end];
}

export function isPeriodRange(value: unknown): value is PeriodRange {
  return Array.isArray(value) && (typeof value[0] === "number" || typeof value[1] === "number");
}

export function sameRange(first: unknown, second: unknown): boolean {
  return isPeriodRange(first) && isPeriodRange(second) && first[0] === second[0] && first[1] === second[1];
}
