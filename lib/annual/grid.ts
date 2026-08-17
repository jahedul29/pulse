import { getDaysInMonth, getDay } from "date-fns";

export function weekdayMon0(d: Date): number {
  return (getDay(d) + 6) % 7;
}

export interface YearGrid {
  year: number;
  rows: number;
  offsets: number[];
  daysInMonth: number[];
}

export function buildYearGrid(year: number): YearGrid {
  const offsets: number[] = [];
  const daysInMonth: number[] = [];
  let rows = 0;
  for (let m = 0; m < 12; m++) {
    const first = new Date(year, m, 1);
    const off = weekdayMon0(first);
    const dim = getDaysInMonth(first);
    offsets.push(off);
    daysInMonth.push(dim);
    rows = Math.max(rows, off + dim);
  }
  return { year, rows, offsets, daysInMonth };
}

export function dayAt(grid: YearGrid, month: number, row: number): number | null {
  const d = row - grid.offsets[month] + 1;
  return d >= 1 && d <= grid.daysInMonth[month] ? d : null;
}

export function isoOf(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}
