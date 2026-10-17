import type { LngLat } from "@/lib/mgrs/grid";

export interface MapView {
  center: LngLat;
  zoom: number;
}

export interface SavedMapView extends MapView {
  countryId: number;
  owner: string;
}

export const CELL_ZOOM = 9;
export const REGION_CENTRE_ZOOM = 10;
export const WORLD_VIEW: MapView = { center: [30, 20], zoom: 2 };
export const UAE_CENTRE: LngLat = [54.4, 24.3];

const MAX_ZOOM = 24;

interface CityCentre {
  country_id: number;
  center: { lat: number; lng: number } | null;
}

export function countryMiddle(cities: CityCentre[], countryId: number): LngLat | null {
  const centres = cities.flatMap((city) => (city.country_id === countryId && city.center ? [city.center] : []));
  if (!centres.length) return null;
  const lats = centres.map((centre) => centre.lat);
  const lngs = centres.map((centre) => centre.lng);
  return [(Math.min(...lngs) + Math.max(...lngs)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2];
}

function inRange(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

export function isSavedMapView(value: unknown): value is SavedMapView {
  if (!value || typeof value !== "object") return false;
  const view = value as Record<string, unknown>;
  const center = view.center;
  return (
    Array.isArray(center) &&
    center.length === 2 &&
    inRange(center[0], -180, 180) &&
    inRange(center[1], -90, 90) &&
    inRange(view.zoom, 0, MAX_ZOOM) &&
    typeof view.countryId === "number" &&
    typeof view.owner === "string" &&
    view.owner.length > 0
  );
}

export function initialRegionView(input: {
  centre: LngLat | null;
  countryId: number;
  owner: string | null;
  lastView: SavedMapView | null;
  middle: LngLat | null;
}): MapView {
  if (input.centre) return { center: input.centre, zoom: REGION_CENTRE_ZOOM };
  const lastView = input.lastView;
  if (lastView && input.owner && lastView.owner === input.owner && lastView.countryId === input.countryId) {
    return { center: lastView.center, zoom: Math.max(lastView.zoom, CELL_ZOOM) };
  }
  if (input.middle) return { center: input.middle, zoom: CELL_ZOOM };
  return WORLD_VIEW;
}
