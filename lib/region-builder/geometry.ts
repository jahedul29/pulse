import type { GeoBounds, LngLat } from "@/lib/mgrs/grid";

export const KM_PER_DEGREE_LATITUDE = 110.574;
export const KM_PER_DEGREE_LONGITUDE_AT_EQUATOR = 111.32;

export function pointInRing([x, y]: LngLat, ring: LngLat[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [currentX, currentY] = ring[i];
    const [previousX, previousY] = ring[j];
    if (currentY > y !== previousY > y && x < ((previousX - currentX) * (y - currentY)) / (previousY - currentY) + currentX) {
      inside = !inside;
    }
  }
  return inside;
}

function orientation(first: LngLat, second: LngLat, third: LngLat): number {
  return (second[0] - first[0]) * (third[1] - first[1]) - (second[1] - first[1]) * (third[0] - first[0]);
}

export function segmentsCross(startA: LngLat, endA: LngLat, startB: LngLat, endB: LngLat): boolean {
  const first = orientation(startA, endA, startB);
  const second = orientation(startA, endA, endB);
  const third = orientation(startB, endB, startA);
  const fourth = orientation(startB, endB, endA);
  return first * second < 0 && third * fourth < 0;
}

export function ringsTouch(cellRing: LngLat[], shapeRing: LngLat[]): boolean {
  for (let i = 0; i < cellRing.length - 1; i++) if (pointInRing(cellRing[i], shapeRing)) return true;
  for (let i = 0; i < shapeRing.length - 1; i++) if (pointInRing(shapeRing[i], cellRing)) return true;
  for (let i = 0; i < cellRing.length - 1; i++) {
    for (let j = 0; j < shapeRing.length - 1; j++) {
      if (segmentsCross(cellRing[i], cellRing[i + 1], shapeRing[j], shapeRing[j + 1])) return true;
    }
  }
  return false;
}

export function estimateCellCount(bounds: GeoBounds): number {
  const middleLatitude = ((bounds.south + bounds.north) / 2) * (Math.PI / 180);
  const widthKm = (bounds.east - bounds.west) * KM_PER_DEGREE_LONGITUDE_AT_EQUATOR * Math.cos(middleLatitude);
  const heightKm = (bounds.north - bounds.south) * KM_PER_DEGREE_LATITUDE;
  return Math.max(0, widthKm) * Math.max(0, heightKm);
}

export function padBoundsByDegrees(bounds: GeoBounds, degrees: number): GeoBounds {
  return {
    west: bounds.west - degrees,
    south: bounds.south - degrees,
    east: bounds.east + degrees,
    north: bounds.north + degrees,
  };
}

export function distanceKm(first: { lat: number; lng: number }, second: { lat: number; lng: number }): number {
  const latitudeScale = Math.cos((((first.lat + second.lat) / 2) * Math.PI) / 180);
  return Math.hypot(
    (first.lng - second.lng) * KM_PER_DEGREE_LONGITUDE_AT_EQUATOR * latitudeScale,
    (first.lat - second.lat) * KM_PER_DEGREE_LATITUDE,
  );
}
