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

export function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${m}/${d}/${y}` : iso;
}
