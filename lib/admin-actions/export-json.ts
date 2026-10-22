import type { ColumnChange } from "./types";

export const JSON_PREVIEW_ITEMS = 25;

export function changesJson(changes: ColumnChange[]): Record<string, { before: string | null; after: string | null }> {
  return Object.fromEntries(changes.map((change) => [change.column, { before: change.before, after: change.after }]));
}

export function jsonPreview(
  value: unknown,
  more: (count: number) => string = (count) => `+${count} more`,
  maxItems = JSON_PREVIEW_ITEMS,
): unknown {
  if (Array.isArray(value)) {
    const shown = value.slice(0, maxItems).map((item) => jsonPreview(item, more, maxItems));
    return value.length > maxItems ? [...shown, more(value.length - maxItems)] : shown;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [key, jsonPreview(nested, more, maxItems)]),
    );
  }
  return value;
}

export function toJsonText(value: unknown): string {
  return JSON.stringify(value ?? null, null, 2);
}
