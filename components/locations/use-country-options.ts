"use client";

import { useMemo } from "react";
import { useLocale } from "next-intl";
import { localizedName } from "@/lib/locations/names";
import { useAllCountries } from "@/lib/locations/queries";

export interface CountryOption {
  id: number;
  label: string;
}

export function useCountryOptions() {
  const locale = useLocale();
  const countriesQuery = useAllCountries();
  const countryNames = useMemo(
    () =>
      new Map(
        (countriesQuery.data ?? []).map((country) => [country.id, localizedName(country.name, country.name_translations, locale)]),
      ),
    [countriesQuery.data, locale],
  );
  const countryOptions = useMemo<CountryOption[]>(
    () => [...countryNames.entries()].map(([id, label]) => ({ id, label })),
    [countryNames],
  );
  return { countriesQuery, countryNames, countryOptions };
}
