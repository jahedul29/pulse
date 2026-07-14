import type { Period } from "./types";

export const PERIODS: Period[] = ["D", "W", "M", "3M", "6M", "12M", "YTD"];

export const PERIOD_LABEL: Record<Period, string> = {
  D: "Today",
  W: "This week",
  M: "This month",
  "3M": "Last 3 months",
  "6M": "Last 6 months",
  "12M": "Last 12 months",
  YTD: "Year to date",
};

export const DEFAULT_PERIOD: Period = "M";

export function isPeriod(value: string | null | undefined): value is Period {
  return !!value && (PERIODS as string[]).includes(value);
}

export function coercePeriod(value: string | null | undefined): Period {
  return isPeriod(value) ? value : DEFAULT_PERIOD;
}
