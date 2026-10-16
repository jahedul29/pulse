import type { LngLat, RingLookup } from "@/lib/mgrs/grid";
import { safeCellCodeAt } from "@/lib/mgrs/mgrs";

function ringCentre(ring: LngLat[]): LngLat {
  let longitude = 0;
  let latitude = 0;
  const corners = ring.length - 1;
  for (let i = 0; i < corners; i++) {
    longitude += ring[i][0];
    latitude += ring[i][1];
  }
  return [longitude / corners, latitude / corners];
}

export function isCentreInside(point: LngLat | null, has: (code: string) => boolean): boolean {
  if (!point) return false;
  const code = safeCellCodeAt(point[1], point[0]);
  return code !== null && has(code);
}

export function middleOfCells(codes: Iterable<string>, rings: RingLookup, has: (code: string) => boolean): LngLat | null {
  const centres: LngLat[] = [];
  let longitudeSum = 0;
  let latitudeSum = 0;
  for (const code of codes) {
    const ring = rings.ring(code);
    if (!ring) continue;
    const centre = ringCentre(ring);
    centres.push(centre);
    longitudeSum += centre[0];
    latitudeSum += centre[1];
  }
  if (!centres.length) return null;
  const mean: LngLat = [longitudeSum / centres.length, latitudeSum / centres.length];
  if (isCentreInside(mean, has)) return mean;
  const latitudeScale = Math.cos((mean[1] * Math.PI) / 180);
  let nearest = centres[0];
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const centre of centres) {
    const distance = ((centre[0] - mean[0]) * latitudeScale) ** 2 + (centre[1] - mean[1]) ** 2;
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = centre;
    }
  }
  return nearest;
}
