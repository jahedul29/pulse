import { apiData, apiFetch } from "@/lib/api/client";
import { ADMIN_IDENTITY } from "@/lib/api/config";
import { listAll } from "@/lib/api/list-query";
import type {
  CityDto,
  CountryDto,
  SaveCoverageBody,
  SaveCoverageResult,
  StoreCityBody,
  StoreCountryBody,
  UpdateCityBody,
  UpdateCountryBody,
} from "./types";

const CITIES = `${ADMIN_IDENTITY}/cities`;
const COUNTRIES = `${ADMIN_IDENTITY}/countries`;
const COVERAGE_SAVE_TIMEOUT_MS = 120_000;

function itemPath(base: string, id: number): string {
  return `${base}/${encodeURIComponent(String(id))}`;
}

export function listAllCities(): Promise<CityDto[]> {
  return listAll<CityDto>(CITIES, { "sort[country_id]": "asc", "sort[sort_order]": "asc" });
}

export function listAllCountries(): Promise<CountryDto[]> {
  return listAll<CountryDto>(COUNTRIES, { "sort[code]": "asc" });
}

export function createCountry(body: StoreCountryBody): Promise<CountryDto> {
  return apiData<CountryDto>(COUNTRIES, { method: "POST", body });
}

export function updateCountry(id: number, body: UpdateCountryBody): Promise<CountryDto> {
  return apiData<CountryDto>(itemPath(COUNTRIES, id), { method: "PUT", body });
}

export function deleteCountry(id: number): Promise<unknown> {
  return apiFetch(itemPath(COUNTRIES, id), { method: "DELETE" });
}

export function createCity(body: StoreCityBody): Promise<CityDto> {
  return apiData<CityDto>(CITIES, { method: "POST", body });
}

export function updateCity(id: number, body: UpdateCityBody): Promise<CityDto> {
  return apiData<CityDto>(itemPath(CITIES, id), { method: "PUT", body });
}

export function deleteCity(id: number): Promise<unknown> {
  return apiFetch(itemPath(CITIES, id), { method: "DELETE" });
}

export function saveCityCoverage(id: number, body: SaveCoverageBody): Promise<SaveCoverageResult> {
  return apiData<SaveCoverageResult>(`${itemPath(CITIES, id)}/coverage`, {
    method: "PUT",
    body,
    timeoutMs: COVERAGE_SAVE_TIMEOUT_MS,
  });
}
