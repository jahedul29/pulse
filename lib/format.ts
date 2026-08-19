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

export function fmtDateTimeParts(epochMs: number, locale = "en"): { time: string; date: string } {
  const dt = new Date(epochMs);
  const hh = String(dt.getHours()).padStart(2, "0");
  const mm = String(dt.getMinutes()).padStart(2, "0");
  const month = new Intl.DateTimeFormat(locale, { month: "short" }).format(dt);
  const day = String(dt.getDate()).padStart(2, "0");
  return { time: `${hh}:${mm}`, date: `${day}-${month}-${dt.getFullYear()}` };
}

export function fmtDateTime(epochMs: number, locale = "en"): string {
  const { time, date } = fmtDateTimeParts(epochMs, locale);
  return `${time} ${date}`;
}
