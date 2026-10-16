import { cellsInBounds, createRingLookup } from "@/lib/mgrs/grid";
import { cellCode, safeCellCodeAt } from "@/lib/mgrs/mgrs";
import { isCentreInside, middleOfCells } from "./centre";

describe("middleOfCells", () => {
  const rings = createRingLookup();

  it("uses the average of the cell centres when it lands on a picked cell", () => {
    const codes = cellsInBounds({ west: 55.3, south: 25.1, east: 55.33, north: 25.13 }).cells.map(cellCode);
    const picked = new Set(codes);
    const middle = middleOfCells(codes, rings, (code) => picked.has(code))!;
    expect(middle[0]).toBeCloseTo(55.315, 2);
    expect(middle[1]).toBeCloseTo(25.115, 2);
    expect(isCentreInside(middle, (code) => picked.has(code))).toBe(true);
  });

  it("snaps to the nearest picked cell when the average falls in a gap", () => {
    const west = cellsInBounds({ west: 55.3, south: 25.1, east: 55.31, north: 25.11 }).cells.map(cellCode);
    const east = cellsInBounds({ west: 55.4, south: 25.1, east: 55.41, north: 25.11 }).cells.map(cellCode);
    const codes = [...west, ...east];
    const picked = new Set(codes);
    const middle = middleOfCells(codes, rings, (code) => picked.has(code))!;
    expect(picked.has(safeCellCodeAt(middle[1], middle[0])!)).toBe(true);
  });

  it("has no centre for an empty region", () => {
    expect(middleOfCells([], rings, () => false)).toBeNull();
    expect(isCentreInside(null, () => true)).toBe(false);
  });
});
