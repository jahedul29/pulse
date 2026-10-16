export interface TranslationMap {
  en?: string;
  ar?: string;
}

export interface GeoPointDto {
  lat: number;
  lng: number;
}

export interface CountryDto {
  id: number;
  code: string;
  name: string | TranslationMap;
  name_translations?: TranslationMap;
  tiles_url: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  cities?: CityDto[];
}

export interface CityDto {
  id: number;
  country_id: number;
  code: string | null;
  name: string | TranslationMap;
  name_translations?: TranslationMap;
  sort_order: number | null;
  is_active: boolean | null;
  center: GeoPointDto | null;
  tiles_url: string | null;
  tiles_version: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface LocalizedNameInput {
  en: string;
  ar?: string;
}

export interface StoreCountryBody {
  code: string;
  name: LocalizedNameInput;
  is_active: boolean;
}

export type UpdateCountryBody = Partial<StoreCountryBody>;

export interface StoreCityBody {
  country_id: number;
  code?: string | null;
  name: LocalizedNameInput;
  is_active: boolean;
}

export type UpdateCityBody = Partial<StoreCityBody>;

export type CoveragePoint = { mgrs: string } | { latitude: number; longitude: number };

export interface SaveCoverageBody {
  center: GeoPointDto;
  points: CoveragePoint[];
}

export interface SaveCoverageResult {
  city_id: number;
  tiles_count: number;
  points_received: number;
  is_active: boolean;
  tiles_url: string | null;
  tiles_version: number;
}
