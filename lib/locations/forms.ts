import { translatedNames } from "./names";
import type { CountryForm, RegionForm } from "./schemas";
import type { CityDto, CountryDto, LocalizedNameInput, StoreCityBody, StoreCountryBody } from "./types";

export const EMPTY_REGION_FORM: RegionForm = { countryId: "", code: "", nameEn: "", nameAr: "", isActive: true };
export const EMPTY_COUNTRY_FORM: CountryForm = { code: "", nameEn: "", nameAr: "", isActive: true };

export function regionFormValues(region: CityDto | null, defaultCountryId: number | null = null): RegionForm {
  if (!region) return { ...EMPTY_REGION_FORM, countryId: defaultCountryId === null ? "" : String(defaultCountryId) };
  const names = translatedNames(region);
  return {
    countryId: String(region.country_id),
    code: region.code ?? "",
    nameEn: names.en,
    nameAr: names.ar,
    isActive: region.is_active !== false,
  };
}

export function countryFormValues(country: CountryDto | null): CountryForm {
  if (!country) return EMPTY_COUNTRY_FORM;
  const names = translatedNames(country);
  return { code: country.code, nameEn: names.en, nameAr: names.ar, isActive: country.is_active !== false };
}

export function nameBody(nameEn: string, nameAr: string): LocalizedNameInput {
  const english = nameEn.trim();
  const arabic = nameAr.trim();
  return arabic ? { en: english, ar: arabic } : { en: english };
}

export function regionBody(values: RegionForm, editing: boolean): StoreCityBody {
  const code = values.code.trim();
  return {
    country_id: Number(values.countryId),
    ...(code ? { code } : editing ? { code: null } : {}),
    name: nameBody(values.nameEn, values.nameAr),
    is_active: values.isActive,
  };
}

export function countryBody(values: CountryForm): StoreCountryBody {
  return {
    code: values.code.trim().toUpperCase(),
    name: nameBody(values.nameEn, values.nameAr),
    is_active: values.isActive,
  };
}
