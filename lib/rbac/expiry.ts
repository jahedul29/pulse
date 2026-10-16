export function dateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function todayKey(now: Date = new Date()): string {
  return dateKey(now);
}

export function parseDateKey(key: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return undefined;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function endOfDayIso(key: string): string | null {
  const date = parseDateKey(key);
  if (!date) return null;
  date.setHours(23, 59, 59, 0);
  return date.toISOString();
}

export function isFutureDateKey(key: string, now: Date = new Date()): boolean {
  return parseDateKey(key) != null && key > todayKey(now);
}
