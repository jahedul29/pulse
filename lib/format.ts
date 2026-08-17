const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const plain = new Intl.NumberFormat("en-US");

export function fmtMoney(n: number): string {
  return currency.format(n);
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
