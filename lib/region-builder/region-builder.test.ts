import uaeSample from "@/lib/mgrs/fixtures/uae-mesh-sample.json";
import { cellCenter, cellRing, cellsInBounds, ringBounds, type LngLat } from "@/lib/mgrs/grid";
import { cellCode, parseMgrs } from "@/lib/mgrs/mgrs";
import { cellsInShape } from "./cells-in-shape";
import { estimateCellCount, pointInRing, ringsTouch } from "./geometry";
import { clipToLongitudes, gridLines } from "./grid-lines";
import { fromMercator, toMercator } from "./mercator";
import { applyMode, resolveMode, strokeAdds } from "./modes";
import { closeRing, ellipseRing, isDegenerateRing, rectangleRing } from "./shapes";

const noModifiers = { shift: false, alt: false };

function metresBetween([lngA, latA]: LngLat, [lngB, latB]: LngLat): number {
  const latitude = ((latA + latB) / 2) * (Math.PI / 180);
  return Math.hypot((lngA - lngB) * 111320 * Math.cos(latitude), (latA - latB) * 110574);
}

function distanceToPolyline(point: LngLat, line: LngLat[]): number {
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < line.length - 1; i++) {
    const [startX, startY] = line[i];
    const [endX, endY] = line[i + 1];
    const lengthSquared = (endX - startX) ** 2 + (endY - startY) ** 2;
    const fraction = lengthSquared
      ? Math.max(0, Math.min(1, ((point[0] - startX) * (endX - startX) + (point[1] - startY) * (endY - startY)) / lengthSquared))
      : 0;
    best = Math.min(best, metresBetween(point, [startX + (endX - startX) * fraction, startY + (endY - startY) * fraction]));
  }
  return best;
}

describe("mercator", () => {
  it("round-trips latitudes", () => {
    for (const latitude of [-60, 0, 24.45, 39.9]) {
      const [, back] = fromMercator(toMercator([55, latitude]));
      expect(back).toBeCloseTo(latitude, 10);
    }
  });
});

describe("shapes", () => {
  it("builds a closed rectangle with edges of constant latitude and longitude", () => {
    const ring = rectangleRing([55, 25], [55.2, 25.1]);
    expect(ring).toHaveLength(5);
    expect(ring[0]).toEqual(ring[4]);
    expect(ring[1]).toEqual([55.2, 25]);
    expect(ring[3]).toEqual([55, 25.1]);
  });

  it("builds a closed 72-point ellipse inside its box", () => {
    const ring = ellipseRing([55, 25], [55.2, 25.1]);
    expect(ring).toHaveLength(73);
    expect(ring[0]).toEqual(ring[72]);
    const bounds = ringBounds(ring);
    expect(bounds.west).toBeCloseTo(55, 6);
    expect(bounds.east).toBeCloseTo(55.2, 6);
    expect(bounds.south).toBeGreaterThanOrEqual(25 - 1e-9);
    expect(bounds.north).toBeLessThanOrEqual(25.1 + 1e-9);
  });

  it("closes polygons and spots degenerate rings", () => {
    expect(closeRing([[1, 1], [2, 1], [2, 2]])).toEqual([[1, 1], [2, 1], [2, 2], [1, 1]]);
    expect(closeRing([])).toEqual([]);
    expect(isDegenerateRing(rectangleRing([55, 25], [55, 25.1]))).toBe(true);
    expect(isDegenerateRing(rectangleRing([55, 25], [55.1, 25.1]))).toBe(false);
  });
});

describe("geometry", () => {
  it("tests points against concave rings", () => {
    const ring: LngLat[] = [[0, 0], [4, 0], [4, 4], [2, 1], [0, 4], [0, 0]];
    expect(pointInRing([1, 0.5], ring)).toBe(true);
    expect(pointInRing([2, 3], ring)).toBe(false);
  });

  it("detects a thin shape crossing a cell with no corner inside either", () => {
    const cell: LngLat[] = [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]];
    const thin: LngLat[] = [[-1, 0.45], [2, 0.45], [2, 0.55], [-1, 0.55], [-1, 0.45]];
    expect(ringsTouch(cell, thin)).toBe(true);
    expect(ringsTouch(cell, [[3, 3], [4, 3], [4, 4], [3, 4], [3, 3]])).toBe(false);
  });

  it("estimates about 100 cells for a 10 km square", () => {
    const estimate = estimateCellCount({ west: 55, south: 25, east: 55 + 10 / (111.32 * Math.cos((25.045 * Math.PI) / 180)), north: 25 + 10 / 110.574 });
    expect(estimate).toBeGreaterThan(95);
    expect(estimate).toBeLessThan(105);
  });
});

describe("cellsInShape", () => {
  it("takes exactly the cells whose centre is inside a rectangle", () => {
    const start: LngLat = [55.2, 25.05];
    const end: LngLat = [55.3, 25.12];
    const result = cellsInShape(rectangleRing(start, end), "centre");
    const expected = cellsInBounds({ west: 55.2, south: 25.05, east: 55.3, north: 25.12 }).cells.map(cellCode).sort();
    expect(result.kind).toBe("ok");
    expect(result.kind === "ok" && [...result.codes].sort()).toEqual(expected);
  });

  it("agrees with a brute-force centre test for an ellipse", () => {
    const ring = ellipseRing([55.25, 25.0], [55.4, 25.1]);
    const result = cellsInShape(ring, "centre");
    const shape = ring.map(toMercator);
    const expected = cellsInBounds(ringBounds(ring))
      .cells.filter((cell) => pointInRing(toMercator(cellCenter(cell)), shape))
      .map(cellCode)
      .sort();
    expect(result.kind === "ok" && [...result.codes].sort()).toEqual(expected);
  });

  it("takes more cells with the touch rule, including every centre-rule cell", () => {
    const ring = ellipseRing([55.25, 25.0], [55.32, 25.05]);
    const centre = cellsInShape(ring, "centre");
    const touch = cellsInShape(ring, "touch");
    expect(centre.kind).toBe("ok");
    expect(touch.kind).toBe("ok");
    if (centre.kind !== "ok" || touch.kind !== "ok") return;
    const touched = new Set(touch.codes);
    expect(centre.codes.every((code) => touched.has(code))).toBe(true);
    expect(touch.codes.length).toBeGreaterThan(centre.codes.length);
  });

  it("matches the backend mesh across the Q/R band line and keeps both zones at the 39/40 seam", () => {
    const { bounds, codes } = uaeSample.bandBoundaryBlock;
    const band = cellsInShape(rectangleRing([bounds.west, bounds.south], [bounds.east, bounds.north]), "centre");
    expect(band.kind === "ok" && [...band.codes].sort()).toEqual(codes);

    const seam = cellsInShape(rectangleRing([53.98, 23.93], [54.02, 23.97]), "centre");
    expect(seam.kind).toBe("ok");
    if (seam.kind !== "ok") return;
    expect(new Set(seam.codes.map((code) => code.slice(0, 2)))).toEqual(new Set(["39", "40"]));
    expect(seam.codes.every((code) => parseMgrs(code) !== null)).toBe(true);
  });

  it("refuses shapes that cover too many cells and reports empty shapes", () => {
    expect(cellsInShape(rectangleRing([51, 22], [57, 27]), "centre").kind).toBe("tooLarge");
    expect(cellsInShape(rectangleRing([55, 25], [55, 25.1]), "centre").kind).toBe("empty");
  });
});

describe("gridLines", () => {
  const box = { west: 55.25, south: 25.0, east: 55.35, north: 25.09 };

  it("draws one line per kilometre in each direction", () => {
    const grid = gridLines(box)!;
    expect(grid.zoneEdges).toHaveLength(0);
    expect(grid.lines.length).toBeGreaterThanOrEqual(18);
    expect(grid.lines.length).toBeLessThanOrEqual(24);
  });

  it("passes through every cell corner within half a metre", () => {
    const grid = gridLines(box)!;
    const cells = cellsInBounds({ west: 55.28, south: 25.03, east: 55.32, north: 25.06 }).cells;
    for (const cell of cells) {
      const corner = cellRing(cell)[0];
      const nearest = Math.min(...grid.lines.map((line) => distanceToPolyline(corner, line)));
      expect(nearest).toBeLessThan(0.5);
    }
  });

  it("stops each zone's lines at the 54 degree meridian and marks the zone edge", () => {
    const grid = gridLines({ west: 53.95, south: 24.0, east: 54.05, north: 24.05 })!;
    expect(grid.zoneEdges).toEqual([[[54, 24.0], [54, 24.05]]]);
    for (const line of grid.lines) {
      const west = Math.min(...line.map(([longitude]) => longitude));
      const east = Math.max(...line.map(([longitude]) => longitude));
      expect(west < 54 - 1e-9 && east > 54 + 1e-9).toBe(false);
    }
  });

  it("gives up when the view holds too many lines", () => {
    expect(gridLines({ west: 50, south: 20, east: 60, north: 30 }, { maxLines: 100 })).toBeNull();
  });

  it("splits a polyline where it leaves the longitude range", () => {
    const pieces = clipToLongitudes([[0, 0], [2, 0], [4, 0]], 1, 3);
    expect(pieces).toEqual([[[1, 0], [2, 0], [3, 0]]]);
  });
});

describe("selection modes", () => {
  it("lets Shift force add and Alt force remove", () => {
    expect(resolveMode("toggle", { shift: true, alt: false })).toBe("add");
    expect(resolveMode("toggle", { shift: false, alt: true })).toBe("remove");
    expect(resolveMode("remove", noModifiers)).toBe("remove");
  });

  it("decides a stroke's direction from the first cell in toggle mode", () => {
    expect(strokeAdds(false, "toggle", noModifiers)).toBe(true);
    expect(strokeAdds(true, "toggle", noModifiers)).toBe(false);
    expect(strokeAdds(null, "toggle", noModifiers)).toBe(true);
    expect(strokeAdds(true, "toggle", { shift: true, alt: false })).toBe(true);
    expect(strokeAdds(false, "add", { shift: false, alt: true })).toBe(false);
  });

  it("applies toggle, add and remove to one cell", () => {
    expect(applyMode(true, "toggle")).toBe(false);
    expect(applyMode(false, "toggle")).toBe(true);
    expect(applyMode(false, "add")).toBe(true);
    expect(applyMode(true, "remove")).toBe(false);
  });
});
