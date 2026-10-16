import chinaSample from "./fixtures/china-tiles-sample.json";
import uaeSample from "./fixtures/uae-mesh-sample.json";
import { cellCenter, cellRing, cellsInBounds, createCornerCache, ringForCode, type LngLat } from "./grid";
import { cellCode, cellCodeAt, formatMgrsCode, latitudeBand, normalizeMgrsCode, parseMgrs, safeCellCodeAt, toCellCode } from "./mgrs";
import { fromUtm, toUtm, utmZoneFor } from "./utm";

function metresBetween([lngA, latA]: LngLat, [lngB, latB]: LngLat): number {
  const latitude = ((latA + latB) / 2) * (Math.PI / 180);
  return Math.hypot((lngA - lngB) * 111320 * Math.cos(latitude), (latA - latB) * 110574);
}

function nearestDistance(point: LngLat, candidates: LngLat[]): number {
  return Math.min(...candidates.map((candidate) => metresBetween(point, candidate)));
}

describe("utm", () => {
  it.each([
    [24.4539, 54.3773],
    [39.9042, 116.4074],
    [-33.8688, 151.2093],
    [64.1466, -21.9426],
    [0.0001, 29.9999],
  ])("round-trips %f, %f within a millimetre", (latitude, longitude) => {
    const back = fromUtm(toUtm(latitude, longitude));
    expect(metresBetween([back.longitude, back.latitude], [longitude, latitude])).toBeLessThan(0.001);
  });

  it("picks zones by longitude, with the Norway and Svalbard exceptions", () => {
    expect(utmZoneFor(24.4, 53.9)).toBe(39);
    expect(utmZoneFor(24.4, 54.1)).toBe(40);
    expect(utmZoneFor(60, 5)).toBe(32);
    expect(utmZoneFor(78, 15)).toBe(33);
  });
});

describe("mgrs codes", () => {
  it("normalizes spaced and lowercase codes", () => {
    expect(normalizeMgrsCode("39q wg 71 53")).toBe("39QWG7153");
  });

  it("reduces any precision to the 1 km cell code", () => {
    expect(toCellCode("15S TC 45237 16452")).toBe("15STC4516");
    expect(toCellCode("39QWG7153")).toBe("39QWG7153");
  });

  it("spaces codes for reading and leaves unknown text alone", () => {
    expect(formatMgrsCode("39QWG7153")).toBe("39Q WG 71 53");
    expect(formatMgrsCode("SEAM-1")).toBe("SEAM-1");
  });

  it("returns null instead of throwing for points outside the grid", () => {
    expect(safeCellCodeAt(25.2, 55.27)).toMatch(/^40R/);
    expect(safeCellCodeAt(89, 10)).toBeNull();
    expect(safeCellCodeAt(Number.NaN, 10)).toBeNull();
  });

  it("rejects malformed codes", () => {
    expect(parseMgrs("SEAM-39QZF0597__40QAL9497")).toBeNull();
    expect(parseMgrs("39QWG715")).toBeNull();
    expect(parseMgrs("39QIG7153")).toBeNull();
    expect(parseMgrs("61QWG7153")).toBeNull();
  });

  it("assigns latitude bands in 8 degree steps", () => {
    expect(latitudeBand(23.9)).toBe("Q");
    expect(latitudeBand(24.1)).toBe("R");
    expect(latitudeBand(83.5)).toBe("X");
    expect(latitudeBand(-0.1)).toBe("M");
  });

  it("round-trips every sampled code through parse and encode", () => {
    for (const { code } of uaeSample.cells) {
      const cell = parseMgrs(code);
      expect(cell && cellCode(cell)).toBe(code);
    }
  });
});

describe("cell geometry against the backend UAE mesh", () => {
  it("rebuilds each sampled cell's corners within a centimetre", () => {
    const cache = createCornerCache();
    for (const { code, ring } of uaeSample.cells) {
      const generated = ringForCode(code, cache);
      expect(generated).not.toBeNull();
      for (const meshCorner of ring as LngLat[]) {
        expect(nearestDistance(meshCorner, generated!.slice(0, 4))).toBeLessThan(0.01);
      }
    }
  });

  it("finds the same code for any point inside a cell", () => {
    for (const { code, ring } of uaeSample.cells) {
      const corners = ring as LngLat[];
      const center: LngLat = [
        corners.reduce((sum, [lng]) => sum + lng, 0) / corners.length,
        corners.reduce((sum, [, lat]) => sum + lat, 0) / corners.length,
      ];
      expect(cellCodeAt(center[1], center[0])).toBe(code);
      for (const [lng, lat] of corners) {
        const inward: LngLat = [lng + (center[0] - lng) * 0.02, lat + (center[1] - lat) * 0.02];
        expect(cellCodeAt(inward[1], inward[0])).toBe(code);
      }
    }
  });

  it("generates exactly the mesh cells across the Q/R latitude band line", () => {
    const { bounds, codes } = uaeSample.bandBoundaryBlock;
    const generated = cellsInBounds(bounds).cells.map(cellCode).sort();
    expect(new Set(generated.map((code) => code[2]))).toEqual(new Set(["Q", "R"]));
    expect(generated).toEqual(codes);
  });

  it("keeps each zone's own cells at the 39/40 seam, where the mesh merges straddling cells", () => {
    const { bounds, codes, seamCodes } = uaeSample.zoneSeamBlock;
    const generated = new Set(cellsInBounds(bounds).cells.map(cellCode));
    for (const code of codes) expect(generated.has(code)).toBe(true);
    const seamParts = new Set(seamCodes.flatMap((seam) => seam.replace("SEAM-", "").split("__")));
    for (const code of generated) expect(codes.includes(code) || seamParts.has(code)).toBe(true);
  });

  it("stops at the limit and reports truncation", () => {
    const result = cellsInBounds({ west: 54.3, south: 24.4, east: 54.5, north: 24.5 }, 50);
    expect(result.cells).toHaveLength(50);
    expect(result.truncated).toBe(true);
  });
});

describe("cell geometry against backend China coverage tiles", () => {
  it("places each tile's north-east corner where the backend file does", () => {
    for (const { code, northEast } of chinaSample.tiles) {
      const cell = parseMgrs(code);
      expect(cell).not.toBeNull();
      const ring = cellRing(cell!);
      expect(metresBetween(ring[2], northEast as LngLat)).toBeLessThan(0.05);
      const [lng, lat] = cellCenter(cell!);
      expect(cellCodeAt(lat, lng)).toBe(code);
    }
  });
});
