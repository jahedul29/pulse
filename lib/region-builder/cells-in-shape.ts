import { cellRing, createCornerCache, forEachCellInBounds, ringBounds, type CornerCache, type LngLat } from "@/lib/mgrs/grid";
import { cellCode } from "@/lib/mgrs/mgrs";
import { estimateCellCount, padBoundsByDegrees, pointInRing, ringsTouch } from "./geometry";
import { toMercator } from "./mercator";
import { isDegenerateRing } from "./shapes";

export type ShapeRule = "centre" | "touch";

export type CellsInShapeResult =
  | { kind: "ok"; codes: string[] }
  | { kind: "tooLarge"; estimate: number }
  | { kind: "empty" };

export const MAX_SHAPE_CELLS = 200000;
const TOUCH_PADDING_DEGREES = 0.015;

export function cellsInShape(
  ring: LngLat[],
  rule: ShapeRule,
  options: { maxCells?: number; corners?: CornerCache } = {},
): CellsInShapeResult {
  if (isDegenerateRing(ring)) return { kind: "empty" };
  const shapeBounds = ringBounds(ring);
  const searchBounds = rule === "touch" ? padBoundsByDegrees(shapeBounds, TOUCH_PADDING_DEGREES) : shapeBounds;
  const estimate = estimateCellCount(searchBounds);
  if (estimate > (options.maxCells ?? MAX_SHAPE_CELLS)) return { kind: "tooLarge", estimate };

  const shape = ring.map(toMercator);
  const corners = options.corners ?? createCornerCache();
  const codes: string[] = [];
  forEachCellInBounds(searchBounds, (cell, center) => {
    if (pointInRing(toMercator(center), shape)) {
      codes.push(cellCode(cell));
      return;
    }
    if (rule === "touch" && ringsTouch(cellRing(cell, corners).map(toMercator), shape)) codes.push(cellCode(cell));
  });
  return codes.length ? { kind: "ok", codes } : { kind: "empty" };
}
