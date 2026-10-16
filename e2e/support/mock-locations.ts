import type { Page, Route } from "@playwright/test";
import { cellsInBounds } from "../../lib/mgrs/grid";
import { cellCode } from "../../lib/mgrs/mgrs";

export const DUBAI_CODES = cellsInBounds({ west: 55.27, south: 25.19, east: 55.3, north: 25.21 }).cells.map(cellCode);

const DUBAI_TILES_URL = "https://abapro.s3.eu-north-1.amazonaws.com/abapro-staging/Media/coverage/cities/DU-01/tiles.v3.json";

export interface CoverageSave {
  cityId: number;
  body: { center: { lat: number; lng: number }; points: Array<{ mgrs: string } | { latitude: number; longitude: number }>; is_active?: boolean };
}

function envelope(data: unknown, status = 200) {
  return { success: true, message: "", status, data };
}

function page1(data: unknown[]) {
  return {
    success: true,
    message: "",
    status: 200,
    data,
    meta: { current_page: 1, last_page: 1, per_page: 100, total: data.length, from: 1, to: data.length },
  };
}

function invalid(field: string, message: string) {
  return { success: false, message: "Validation failed", errors: [{ field, messages: [message] }], status: 422 };
}

export async function mockLocations(page: Page) {
  const stamp = "2026-10-10T08:00:00Z";
  const countries: Record<string, unknown>[] = [
    { id: 1, code: "AE", name: "United Arab Emirates", name_translations: { en: "United Arab Emirates", ar: "الإمارات" }, tiles_url: null, is_active: true, created_at: stamp, updated_at: stamp },
    { id: 2, code: "OM", name: "Oman", name_translations: { en: "Oman" }, tiles_url: null, is_active: true, created_at: stamp, updated_at: stamp },
  ];
  const cities: Record<string, unknown>[] = [
    { id: 10, country_id: 1, code: "DU-01", name: "Dubai", name_translations: { en: "Dubai", ar: "دبي" }, sort_order: 1, is_active: true, center: { lat: 25.2, lng: 55.285 }, tiles_url: DUBAI_TILES_URL, tiles_version: 3, created_at: stamp, updated_at: stamp },
    { id: 11, country_id: 1, code: null, name: "Fujairah", name_translations: { en: "Fujairah" }, sort_order: 2, is_active: true, center: null, tiles_url: null, tiles_version: 0, created_at: stamp, updated_at: stamp },
  ];
  const coverageSaves: CoverageSave[] = [];
  let nextId = 500;

  await page.route("**/tiles.openfreemap.org/**", (route) => route.abort());
  await page.route("**/coverage-files/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ version: 3, tiles: DUBAI_CODES.map((code) => ({ t: code, a: true })) }),
    }),
  );

  await page.route(/\/api\/admin-identity\/(countries|cities)(\/|\?|$)/, async (route: Route) => {
    const request = route.request();
    const method = request.method();
    const pathname = new URL(request.url()).pathname.replace(/^.*\/api\/admin-identity/, "");
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

    if (pathname === "/countries" && method === "GET") return json(page1(countries));
    if (pathname === "/countries" && method === "POST") {
      const body = request.postDataJSON() as { code: string; name: { en: string; ar?: string }; is_active: boolean };
      if (countries.some((country) => country.code === body.code)) return json(invalid("code", "The code has already been taken."), 422);
      const created = { id: (nextId += 1), code: body.code, name: body.name.en, name_translations: body.name, tiles_url: null, is_active: body.is_active, created_at: stamp, updated_at: stamp };
      countries.push(created);
      return json(envelope(created, 201), 201);
    }
    if (pathname === "/cities" && method === "GET") return json(page1(cities));
    if (pathname === "/cities" && method === "POST") {
      const body = request.postDataJSON() as { country_id: number; code?: string; name: { en: string; ar?: string }; is_active: boolean };
      const created = { id: (nextId += 1), country_id: body.country_id, code: body.code ?? null, name: body.name.en, name_translations: body.name, sort_order: null, is_active: body.is_active, center: null, tiles_url: null, tiles_version: 0, created_at: stamp, updated_at: stamp };
      cities.push(created);
      return json(envelope(created, 201), 201);
    }
    const coverageMatch = pathname.match(/^\/cities\/(\d+)\/coverage$/);
    if (coverageMatch && method === "PUT") {
      const cityId = Number(coverageMatch[1]);
      const body = request.postDataJSON() as CoverageSave["body"];
      coverageSaves.push({ cityId, body });
      const city = cities.find((entry) => entry.id === cityId);
      const version = Number(city?.tiles_version ?? 0) + 1;
      if (city) Object.assign(city, { tiles_version: version, tiles_url: DUBAI_TILES_URL.replace(/v\d+\.json$/, `v${version}.json`), center: body.center });
      return json(
        envelope({ city_id: cityId, tiles_count: body.points.length, points_received: body.points.length, is_active: city?.is_active ?? true, tiles_url: city?.tiles_url ?? null, tiles_version: version }),
      );
    }
    const cityMatch = pathname.match(/^\/cities\/(\d+)$/);
    if (cityMatch && method === "DELETE") {
      const index = cities.findIndex((entry) => entry.id === Number(cityMatch[1]));
      if (index >= 0) cities.splice(index, 1);
      return json(envelope(null));
    }
    return route.fallback();
  });

  return { coverageSaves };
}
