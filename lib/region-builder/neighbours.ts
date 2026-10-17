import { distanceKm } from "./geometry";

export interface NeighbourCandidate {
  id: number;
  country_id: number;
  sort_order: number | null;
  center: { lat: number; lng: number } | null;
  tiles_url: string | null;
}

export const NEIGHBOUR_COUNT = 3;
export const NEIGHBOUR_RADIUS_KM = 300;

export function nearestNeighbours<T extends NeighbourCandidate>(
  region: T,
  candidates: T[],
  fallbackOrigin: { lat: number; lng: number } | null = null,
): T[] {
  const centre = region.center ?? fallbackOrigin;
  return candidates
    .filter((city) => city.id !== region.id && city.country_id === region.country_id && city.tiles_url)
    .map((city) => ({ city, distance: centre && city.center ? distanceKm(centre, city.center) : Number.POSITIVE_INFINITY }))
    .filter((entry) => entry.distance <= NEIGHBOUR_RADIUS_KM)
    .sort((first, second) => first.distance - second.distance)
    .slice(0, NEIGHBOUR_COUNT)
    .map((entry) => entry.city);
}
