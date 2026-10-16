import { cellCenter, type LngLat } from "@/lib/mgrs/grid";
import { CELL_SIZE, formatMgrsCode, normalizeMgrsCode, parseMgrs, safeCellCodeAt, type MgrsCell } from "@/lib/mgrs/mgrs";
import { fromUtm } from "@/lib/mgrs/utm";
import type { CoveragePoint, SaveCoverageBody } from "./types";

const CELL_CODE_PATTERN = /^(\d{1,2}[C-HJ-NP-X][A-HJ-NP-Z][A-HJ-NP-V])(\d{2})(\d{2})$/;
const CENTRE = CELL_SIZE / 2;
const EDGE_INSET = 1;
const EDGE_STEP = 20;
const SLIVER_OFFSETS = [0.02, 0.1, 0.3, 0.5, CELL_SIZE - 0.5, CELL_SIZE - 0.3, CELL_SIZE - 0.1, CELL_SIZE - 0.02];
const SLIVER_STEP = 10;
const COORDINATE_DECIMALS = 7;

function roundCoordinate(value: number): number {
  return Number(value.toFixed(COORDINATE_DECIMALS));
}

function positionAt(cell: MgrsCell, east: number, north: number): { latitude: number; longitude: number } {
  return fromUtm({ zone: cell.zone, north: cell.north, easting: cell.easting + east, northing: cell.northing + north });
}

function metreOffsets(): Array<[number, number]> {
  const offsets: Array<[number, number]> = [];
  const far = CELL_SIZE - EDGE_INSET;
  for (let along = EDGE_INSET; along <= far; along += EDGE_STEP) {
    offsets.push([EDGE_INSET, along], [far, along], [along, EDGE_INSET], [along, far]);
  }
  offsets.push([far, far]);
  return offsets;
}

const METRE_OFFSETS = metreOffsets();

function sliverPoint(cell: MgrsCell, code: string): CoveragePoint | null {
  for (let north = SLIVER_STEP / 2; north < CELL_SIZE; north += SLIVER_STEP) {
    for (const east of SLIVER_OFFSETS) {
      for (const [eastOffset, northOffset] of [
        [east, north],
        [north, east],
      ]) {
        const position = positionAt(cell, eastOffset, northOffset);
        const latitude = roundCoordinate(position.latitude);
        const longitude = roundCoordinate(position.longitude);
        if (safeCellCodeAt(latitude, longitude) === code) return { latitude, longitude };
      }
    }
  }
  return null;
}

export function coveragePoint(code: string): CoveragePoint {
  const normalized = normalizeMgrsCode(code);
  const match = CELL_CODE_PATTERN.exec(normalized);
  const cell = match ? parseMgrs(normalized) : null;
  if (!match || !cell) return { mgrs: code };
  const [, square, easting, northing] = match;
  const mgrsAt = (east: number, north: number) =>
    formatMgrsCode(`${square}${easting}${String(east).padStart(3, "0")}${northing}${String(north).padStart(3, "0")}`);

  const [centreLongitude, centreLatitude] = cellCenter(cell);
  if (safeCellCodeAt(centreLatitude, centreLongitude) === normalized) return { mgrs: mgrsAt(CENTRE, CENTRE) };
  for (const [east, north] of METRE_OFFSETS) {
    const position = positionAt(cell, east, north);
    if (safeCellCodeAt(position.latitude, position.longitude) === normalized) return { mgrs: mgrsAt(east, north) };
  }
  return sliverPoint(cell, normalized) ?? { mgrs: mgrsAt(CENTRE, CENTRE) };
}

export function coverageBody(codes: string[], centre: LngLat): SaveCoverageBody {
  return {
    center: { lat: roundCoordinate(centre[1]), lng: roundCoordinate(centre[0]) },
    points: codes.map(coveragePoint),
  };
}
