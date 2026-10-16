import type { CityDto, CountryDto } from "@/lib/locations/types";

export function cityFixture(overrides: Partial<CityDto> & Pick<CityDto, "id" | "country_id">): CityDto {
  return {
    code: null,
    name: `City ${overrides.id}`,
    name_translations: { en: `City ${overrides.id}` },
    sort_order: overrides.id,
    is_active: true,
    center: null,
    tiles_url: null,
    tiles_version: 0,
    created_at: "2026-10-01T10:00:00Z",
    updated_at: "2026-10-02T10:00:00Z",
    ...overrides,
  };
}

export function countryFixture(overrides: Partial<CountryDto> & Pick<CountryDto, "id" | "code">): CountryDto {
  return {
    name: `Country ${overrides.id}`,
    name_translations: { en: `Country ${overrides.id}` },
    tiles_url: null,
    is_active: true,
    created_at: "2026-10-01T10:00:00Z",
    updated_at: "2026-10-01T10:00:00Z",
    ...overrides,
  };
}

export const COUNTRIES: CountryDto[] = [
  countryFixture({ id: 1, code: "AE", name: "United Arab Emirates", name_translations: { en: "United Arab Emirates", ar: "الإمارات" } }),
  countryFixture({ id: 2, code: "CN", name: "China", name_translations: { en: "China" } }),
  countryFixture({ id: 3, code: "OM", name: "Oman", name_translations: { en: "Oman" } }),
];

export const CITIES: CityDto[] = [
  cityFixture({
    id: 10,
    country_id: 1,
    name: "Abu Dhabi",
    name_translations: { en: "Abu Dhabi", ar: "أبوظبي" },
    code: "AD-01",
    sort_order: 1,
    tiles_url: "https://cdn.example.com/ad.json",
    tiles_version: 4,
    center: { lat: 24.45, lng: 54.37 },
  }),
  cityFixture({ id: 11, country_id: 1, name: "Dubai", name_translations: { en: "Dubai" }, sort_order: 2 }),
  cityFixture({ id: 20, country_id: 2, name: "Beijing", name_translations: { en: "Beijing" } }),
];
