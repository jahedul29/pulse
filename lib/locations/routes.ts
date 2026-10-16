export const COUNTRIES_PATH = "/admin/locations/countries";
export const REGIONS_PATH = "/admin/locations/regions";
export const BUILDER_PATH = "/admin/locations/builder";

export function regionHref(id: number | string): string {
  return `${BUILDER_PATH}?region=${encodeURIComponent(String(id))}`;
}

export function countryRegionsHref(countryId: number | string): string {
  return `${REGIONS_PATH}?country=${encodeURIComponent(String(countryId))}`;
}

export function parseRouteId(raw: string | null | undefined): number | null {
  if (!raw || !/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return id > 0 ? id : null;
}
