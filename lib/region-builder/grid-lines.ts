import { hemisphereParts, type GeoBounds, type LngLat } from "@/lib/mgrs/grid";
import { CELL_SIZE } from "@/lib/mgrs/mgrs";
import { FALSE_NORTHING_SOUTH, fromUtm, toUtm } from "@/lib/mgrs/utm";

export interface GridLines {
  lines: LngLat[][];
  zoneEdges: LngLat[][];
}

const ZONE_WIDTH_DEGREES = 6;

function zoneWestEdge(zone: number): number {
  return (zone - 1) * ZONE_WIDTH_DEGREES - 180;
}

function sampledValues(minimum: number, maximum: number, step: number): number[] {
  const values = [minimum];
  for (let value = Math.ceil(minimum / step) * step; value < maximum; value += step) {
    if (value > minimum) values.push(value);
  }
  values.push(maximum);
  return values;
}

function interpolateAtLongitude(start: LngLat, end: LngLat, longitude: number): LngLat {
  const fraction = (longitude - start[0]) / (end[0] - start[0]);
  return [longitude, start[1] + (end[1] - start[1]) * fraction];
}

export function clipToLongitudes(points: LngLat[], west: number, east: number): LngLat[][] {
  const pieces: LngLat[][] = [];
  let current: LngLat[] = [];
  const inside = (point: LngLat) => point[0] >= west && point[0] <= east;

  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const previous = points[i - 1];
    if (previous) {
      const previousInside = inside(previous);
      const pointInside = inside(point);
      if (previousInside && !pointInside) {
        current.push(interpolateAtLongitude(previous, point, point[0] > east ? east : west));
        pieces.push(current);
        current = [];
      } else if (!previousInside && pointInside) {
        current.push(interpolateAtLongitude(previous, point, previous[0] > east ? east : west));
      }
    }
    if (inside(point)) current.push(point);
  }
  if (current.length) pieces.push(current);
  return pieces.filter((piece) => piece.length >= 2);
}

export function gridLines(
  bounds: GeoBounds,
  options: { sampleMetres?: number; maxLines?: number } = {},
): GridLines | null {
  const sampleMetres = options.sampleMetres ?? 10000;
  const maxLines = options.maxLines ?? 6000;
  const lines: LngLat[][] = [];
  const zoneEdges: LngLat[][] = [];
  const firstZone = Math.max(1, Math.floor((bounds.west + 180) / ZONE_WIDTH_DEGREES) + 1);
  const lastZone = Math.min(60, Math.floor((bounds.east + 180) / ZONE_WIDTH_DEGREES) + 1);

  for (let zone = firstZone; zone <= lastZone; zone++) {
    const zoneWest = zoneWestEdge(zone);
    const west = Math.max(bounds.west, zoneWest);
    const east = Math.min(bounds.east, zoneWest + ZONE_WIDTH_DEGREES);
    if (west >= east) continue;
    if (zone > firstZone) zoneEdges.push([[zoneWest, bounds.south], [zoneWest, bounds.north]]);

    for (const part of hemisphereParts(bounds)) {
      const eastings: number[] = [];
      const northings: number[] = [];
      for (const latitude of [part.south, (part.south + part.north) / 2, part.north]) {
        for (const longitude of [west, (west + east) / 2, east]) {
          const point = toUtm(latitude, longitude, zone);
          eastings.push(point.easting);
          northings.push(!part.northern && point.north ? point.northing + FALSE_NORTHING_SOUTH : point.northing);
        }
      }
      const minEasting = Math.min(...eastings);
      const maxEasting = Math.max(...eastings);
      const minNorthing = Math.min(...northings);
      const maxNorthing = Math.max(...northings);
      const firstEasting = Math.ceil(minEasting / CELL_SIZE) * CELL_SIZE;
      const firstNorthing = Math.ceil(minNorthing / CELL_SIZE) * CELL_SIZE;
      const eastingCount = Math.floor((maxEasting - firstEasting) / CELL_SIZE) + 1;
      const northingCount = Math.floor((maxNorthing - firstNorthing) / CELL_SIZE) + 1;
      if (lines.length + eastingCount + northingCount > maxLines) return null;

      const toLngLat = (easting: number, northing: number): LngLat => {
        const position = fromUtm({ zone, north: part.northern, easting, northing });
        return [position.longitude, position.latitude];
      };
      const northingSamples = sampledValues(minNorthing, maxNorthing, sampleMetres);
      const eastingSamples = sampledValues(minEasting, maxEasting, sampleMetres);

      for (let easting = firstEasting; easting <= maxEasting; easting += CELL_SIZE) {
        lines.push(...clipToLongitudes(northingSamples.map((northing) => toLngLat(easting, northing)), west, east));
      }
      for (let northing = firstNorthing; northing <= maxNorthing; northing += CELL_SIZE) {
        lines.push(...clipToLongitudes(eastingSamples.map((easting) => toLngLat(easting, northing)), west, east));
      }
    }
  }
  return { lines, zoneEdges };
}
