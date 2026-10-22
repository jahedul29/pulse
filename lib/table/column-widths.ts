export type WidthRange = { min: number; max: number };

export const COLUMN_WIDTHS = {
  name: { min: 180, max: 320 },
  email: { min: 200, max: 320 },
  chips: { min: 200, max: 360 },
  text: { min: 200, max: 480 },
  label: { min: 130, max: 220 },
} as const satisfies Record<string, WidthRange>;

export type ColumnWidthPreset = keyof typeof COLUMN_WIDTHS;

export function columnWidth(preset: ColumnWidthPreset, override: Partial<WidthRange> = {}) {
  const { min, max } = { ...COLUMN_WIDTHS[preset], ...override };
  return { size: min, maxSize: Math.max(min, max) };
}

export function widthRange(size: number, maxSize: number | undefined): WidthRange {
  const max = maxSize != null && Number.isFinite(maxSize) && maxSize < Number.MAX_SAFE_INTEGER ? maxSize : size;
  return { min: size, max: Math.max(size, max) };
}

export type ColumnLayout = { widths: number[]; filler: number; total: number };

export const SOFT_MAX_GROWTH = 1.5;

function sum(widths: number[]) {
  return widths.reduce((total, width) => total + width, 0);
}

function spread(from: number[], to: number[], available: number): number[] {
  const room = sum(to) - sum(from);
  const share = room > 0 ? (available - sum(from)) / room : 0;
  const widths = from.map((width, index) => Math.floor(width + (to[index] - width) * share));
  let remainder = available - sum(widths);
  for (let i = widths.length - 1; i >= 0 && remainder > 0; i--) {
    const extra = Math.min(remainder, to[i] - widths[i]);
    widths[i] += extra;
    remainder -= extra;
  }
  return widths;
}

export function distributeWidths(ranges: WidthRange[], available: number): ColumnLayout {
  const mins = ranges.map((range) => range.min);
  const maxes = ranges.map((range) => range.max);
  const softMaxes = maxes.map((width) => Math.round(width * SOFT_MAX_GROWTH));
  if (available <= sum(mins)) return { widths: mins, filler: 0, total: sum(mins) };
  if (available <= sum(maxes)) return { widths: spread(mins, maxes, available), filler: 0, total: available };
  if (available <= sum(softMaxes)) return { widths: spread(maxes, softMaxes, available), filler: 0, total: available };
  return { widths: softMaxes, filler: available - sum(softMaxes), total: available };
}
