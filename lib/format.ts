import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";

const money = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const plain = new Intl.NumberFormat("en-US");

export function fmtMoney(n: number): string {
  return money.format(n);
}

export function fmtNumber(n: number): string {
  return plain.format(n);
}

export function fmtCompact(n: number): string {
  return compact.format(n);
}

export function fmtDelta(n: number): string {
  return `${n > 0 ? "+" : ""}${n}%`;
}

const monthFmtCache = new Map<string, Intl.DateTimeFormat>();

function monthFmt(locale: string): Intl.DateTimeFormat {
  let fmt = monthFmtCache.get(locale);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" });
    monthFmtCache.set(locale, fmt);
  }
  return fmt;
}

export function fmtDate(iso: string, locale = "en"): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const month = monthFmt(locale).format(new Date(Date.UTC(y, m - 1, d)));
  return `${String(d).padStart(2, "0")}-${month}-${y}`;
}

const dateTimeFmtCache = new Map<string, Intl.DateTimeFormat>();

function dateTimeFmt(locale: string): Intl.DateTimeFormat {
  let fmt = dateTimeFmtCache.get(locale);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(`${locale}-u-nu-latn`, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    dateTimeFmtCache.set(locale, fmt);
  }
  return fmt;
}

export function fmtDateTimeParts(epochMs: number, locale = "en"): { time: string; date: string } {
  const parts = dateTimeFmt(locale).formatToParts(new Date(epochMs));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return {
    time: `${get("hour")}:${get("minute")}`,
    date: `${get("day")}-${get("month")}-${get("year")}`,
  };
}

export function fmtDateTime(epochMs: number, locale = "en"): string {
  const { time, date } = fmtDateTimeParts(epochMs, locale);
  return `${time} ${date}`;
}

export function startOfTomorrow(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return d;
}

export function fmtRelative(epochMs: number, locale = "en"): string {
  return formatDistanceToNow(new Date(epochMs), {
    addSuffix: true,
    locale: locale === "ar" ? ar : enUS,
  });
}
