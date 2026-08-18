import type { Period } from "./types";

export const PERIODS: Period[] = ["D", "W", "M", "3M", "6M", "12M", "YTD"];

export const DEFAULT_PERIOD: Period = "M";

export function isPeriod(value: string | null | undefined): value is Period {
  return !!value && (PERIODS as string[]).includes(value);
}

export function coercePeriod(value: string | null | undefined): Period {
  return isPeriod(value) ? value : DEFAULT_PERIOD;
}
