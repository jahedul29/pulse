import { COLUMN_WIDTHS, columnWidth, distributeWidths, widthRange } from "./column-widths";

const ranges = [
  { min: 180, max: 320 },
  { min: 120, max: 120 },
  { min: 200, max: 480 },
];

describe("columnWidth", () => {
  it("turns a preset into a starting size and a maximum", () => {
    expect(columnWidth("name")).toEqual({ size: COLUMN_WIDTHS.name.min, maxSize: COLUMN_WIDTHS.name.max });
    expect(columnWidth("text", { min: 240 })).toEqual({ size: 240, maxSize: COLUMN_WIDTHS.text.max });
    expect(columnWidth("label", { min: 300 })).toEqual({ size: 300, maxSize: 300 });
  });
});

describe("widthRange", () => {
  it("keeps a column without a maximum at its size", () => {
    expect(widthRange(150, Number.MAX_SAFE_INTEGER)).toEqual({ min: 150, max: 150 });
    expect(widthRange(150, undefined)).toEqual({ min: 150, max: 150 });
    expect(widthRange(180, 320)).toEqual({ min: 180, max: 320 });
  });
});

describe("distributeWidths", () => {
  it("keeps every column at its minimum and scrolls when the window is too narrow", () => {
    expect(distributeWidths(ranges, 400)).toEqual({ widths: [180, 120, 200], filler: 0, total: 500 });
  });

  it("shares the extra space by each column's room to grow and fills the window exactly", () => {
    const layout = distributeWidths(ranges, 710);
    expect(layout.total).toBe(710);
    expect(layout.filler).toBe(0);
    expect(layout.widths[1]).toBe(120);
    expect(layout.widths.reduce((sum, width) => sum + width, 0)).toBe(710);
    expect(layout.widths[0]).toBeGreaterThan(180);
    expect(layout.widths[0]).toBeLessThan(320);
    expect(layout.widths[2]).toBeGreaterThan(200);
  });

  it("lets every column grow past its maximum, up to half as much again, before leaving space", () => {
    const layout = distributeWidths(ranges, 1150);
    expect(layout.filler).toBe(0);
    expect(layout.total).toBe(1150);
    expect(layout.widths.reduce((sum, width) => sum + width, 0)).toBe(1150);
    expect(layout.widths[0]).toBeGreaterThan(320);
    expect(layout.widths[1]).toBeGreaterThan(120);
    expect(layout.widths[2]).toBeLessThanOrEqual(720);
  });

  it("stops at one and a half times the maximum and leaves the rest of the row empty", () => {
    expect(distributeWidths(ranges, 2000)).toEqual({ widths: [480, 180, 720], filler: 620, total: 2000 });
  });

  it("lays out before the container is measured as if it were the minimum", () => {
    expect(distributeWidths(ranges, 0).total).toBe(500);
  });
});
