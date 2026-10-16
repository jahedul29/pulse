import { CELL_SIZE, floorToCell, latitudeBand, parseMgrs, type MgrsCell } from "./mgrs";
import { FALSE_NORTHING_SOUTH, fromUtm, toUtm, utmZoneFor } from "./utm";

export type LngLat = [number, number];

export interface GeoBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export type CornerCache = Map<string, LngLat>;


export function createCornerCache(): CornerCache {
  return new Map();
}

function corner(zone: number, north: boolean, easting: number, northing: number, cache?: CornerCache): LngLat {
  const key = `${zone}:${north ? "N" : "S"}:${easting}:${northing}`;
  const cached = cache?.get(key);
  if (cached) return cached;
  const position = fromUtm({ zone, north, easting, northing });
  const point: LngLat = [position.longitude, position.latitude];
  cache?.set(key, point);
  return point;
}

export function cellRing(cell: MgrsCell, cache?: CornerCache): LngLat[] {
  const { zone, north, easting, northing } = cell;
  const southWest = corner(zone, north, easting, northing, cache);
  return [
    southWest,
    corner(zone, north, easting + CELL_SIZE, northing, cache),
    corner(zone, north, easting + CELL_SIZE, northing + CELL_SIZE, cache),
    corner(zone, north, easting, northing + CELL_SIZE, cache),
    southWest,
  ];
}

export function ringForCode(code: string, cache?: CornerCache): LngLat[] | null {
  const cell = parseMgrs(code);
  return cell ? cellRing(cell, cache) : null;
}

export function cellCenter(cell: MgrsCell): LngLat {
  const position = fromUtm({
    zone: cell.zone,
    north: cell.north,
    easting: cell.easting + CELL_SIZE / 2,
    northing: cell.northing + CELL_SIZE / 2,
  });
  return [position.longitude, position.latitude];
}

export function hemisphereParts(bounds: GeoBounds): Array<{ south: number; north: number; northern: boolean }> {
  if (bounds.south >= 0) return [{ south: bounds.south, north: bounds.north, northern: true }];
  if (bounds.north <= 0) return [{ south: bounds.south, north: bounds.north, northern: false }];
  return [
    { south: bounds.south, north: 0, northern: false },
    { south: 0, north: bounds.north, northern: true },
  ];
}

export function forEachCellInBounds(bounds: GeoBounds, visit: (cell: MgrsCell, center: LngLat) => boolean | void): boolean {
  const firstZone = Math.max(1, Math.floor((bounds.west + 180) / 6) + 1);
  const lastZone = Math.min(60, Math.floor((bounds.east + 180) / 6) + 1);

  for (let zone = firstZone; zone <= lastZone; zone++) {
    for (const part of hemisphereParts(bounds)) {
      const eastings: number[] = [];
      const northings: number[] = [];
      for (const latitude of [part.south, (part.south + part.north) / 2, part.north]) {
        for (const longitude of [bounds.west, (bounds.west + bounds.east) / 2, bounds.east]) {
          const point = toUtm(latitude, longitude, zone);
          eastings.push(point.easting);
          northings.push(!part.northern && point.north ? point.northing + FALSE_NORTHING_SOUTH : point.northing);
        }
      }
      const minEasting = floorToCell(Math.min(...eastings)) - CELL_SIZE;
      const maxEasting = Math.max(...eastings);
      const minNorthing = floorToCell(Math.min(...northings)) - CELL_SIZE;
      const maxNorthing = Math.max(...northings);

      for (let easting = minEasting; easting <= maxEasting; easting += CELL_SIZE) {
        for (let northing = minNorthing; northing <= maxNorthing; northing += CELL_SIZE) {
          const center = fromUtm({
            zone,
            north: part.northern,
            easting: easting + CELL_SIZE / 2,
            northing: northing + CELL_SIZE / 2,
          });
          if (
            center.longitude < bounds.west ||
            center.longitude > bounds.east ||
            center.latitude < part.south ||
            center.latitude > part.north ||
            utmZoneFor(center.latitude, center.longitude) !== zone
          ) {
            continue;
          }
          const cell = { zone, band: latitudeBand(center.latitude), north: part.northern, easting, northing };
          if (visit(cell, [center.longitude, center.latitude]) === false) return false;
        }
      }
    }
  }
  return true;
}

export function cellsInBounds(bounds: GeoBounds, limit = Number.POSITIVE_INFINITY): { cells: MgrsCell[]; truncated: boolean } {
  const cells: MgrsCell[] = [];
  const completed = forEachCellInBounds(bounds, (cell) => {
    cells.push(cell);
    if (cells.length >= limit) return false;
  });
  return { cells, truncated: !completed };
}

export interface RingLookup {
  ring(code: string): LngLat[] | null;
}

export function createRingLookup(): RingLookup {
  const rings = new Map<string, LngLat[] | null>();
  const corners = createCornerCache();
  return {
    ring(code) {
      const cached = rings.get(code);
      if (cached !== undefined) return cached;
      const ring = ringForCode(code, corners);
      rings.set(code, ring);
      return ring;
    },
  };
}

export function ringBounds(ring: LngLat[]): GeoBounds {
  let west = Number.POSITIVE_INFINITY;
  let south = Number.POSITIVE_INFINITY;
  let east = Number.NEGATIVE_INFINITY;
  let north = Number.NEGATIVE_INFINITY;
  for (const [longitude, latitude] of ring) {
    if (longitude < west) west = longitude;
    if (longitude > east) east = longitude;
    if (latitude < south) south = latitude;
    if (latitude > north) north = latitude;
  }
  return { west, south, east, north };
}


export function codesBounds(codes: Iterable<string>, rings: RingLookup): GeoBounds | null {
  let bounds: GeoBounds | null = null;
  for (const code of codes) {
    const ring = rings.ring(code);
    if (!ring) continue;
    const cell = ringBounds(ring);
    bounds = bounds
      ? {
          west: Math.min(bounds.west, cell.west),
          south: Math.min(bounds.south, cell.south),
          east: Math.max(bounds.east, cell.east),
          north: Math.max(bounds.north, cell.north),
        }
      : cell;
  }
  return bounds;
}
