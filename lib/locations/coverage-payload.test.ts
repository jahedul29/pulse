import { parseMgrs, safeCellCodeAt } from "@/lib/mgrs/mgrs";
import { fromUtm } from "@/lib/mgrs/utm";
import { coverageBody, coveragePoint } from "./coverage-payload";

function pointLandsInCell(code: string): boolean {
  const point = coveragePoint(code);
  if ("latitude" in point) return safeCellCodeAt(point.latitude, point.longitude) === code;
  const cell = parseMgrs(code);
  const digits = point.mgrs.split(" ");
  if (!cell || digits.length !== 4) return false;
  const position = fromUtm({
    zone: cell.zone,
    north: cell.north,
    easting: cell.easting + Number(digits[2].slice(2)),
    northing: cell.northing + Number(digits[3].slice(2)),
  });
  return safeCellCodeAt(position.latitude, position.longitude) === code;
}

function seamCodes(meridian: number, south: number, north: number): Set<string> {
  const codes = new Set<string>();
  for (let latitude = south; latitude <= north; latitude += 0.001) {
    for (const offset of [-2e-5, -1e-6, -1e-7, 1e-7, 1e-6, 2e-5]) {
      const code = safeCellCodeAt(latitude, meridian + offset);
      if (code) codes.add(code);
    }
  }
  return codes;
}

describe("coveragePoint", () => {
  it("sends the middle of a cell as a 1 m MGRS point", () => {
    expect(coveragePoint("39QWG7153")).toEqual({ mgrs: "39Q WG 71500 53500" });
    expect(coveragePoint("39q wg 71 53")).toEqual({ mgrs: "39Q WG 71500 53500" });
  });

  it("moves the point inside the cell when its middle falls in another zone", () => {
    expect(pointLandsInCell("40RAN9512")).toBe(true);
    expect(coveragePoint("40RAN9512")).not.toEqual({ mgrs: "40R AN 95500 12500" });
  });

  it("places a point inside thin seam slivers", () => {
    for (const code of ["39QZF0824", "40QAL9124", "39QZF0773", "39RZG0568", "40RAN9660"]) {
      expect([code, pointLandsInCell(code)]).toEqual([code, true]);
    }
  });

  it("always picks a point the cell itself contains along the UAE zone seam", () => {
    const misplaced = [...seamCodes(54, 22.5, 26.5)].filter((code) => !pointLandsInCell(code));
    expect(misplaced).toEqual([]);
  });

  it("does the same on the next seam east", () => {
    const misplaced = [...seamCodes(60, 22.5, 25)].filter((code) => !pointLandsInCell(code));
    expect(misplaced).toEqual([]);
  });

  it("passes codes it can't place through unchanged", () => {
    expect(coveragePoint("SEAM-1234")).toEqual({ mgrs: "SEAM-1234" });
    expect(coveragePoint("39QWG715536")).toEqual({ mgrs: "39QWG715536" });
  });
});

describe("coverageBody", () => {
  it("builds the save request with the centre rounded to 7 decimals and no status", () => {
    expect(coverageBody(["39QWG7153"], [54.123456789, 24.987654321])).toEqual({
      center: { lat: 24.9876543, lng: 54.1234568 },
      points: [{ mgrs: "39Q WG 71500 53500" }],
    });
  });
});
