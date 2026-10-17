import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/query-keys";
import { PERMISSIONS, useHasPermission } from "@/lib/auth/permissions";
import type { LngLat } from "@/lib/mgrs/grid";
import { fetchCoverageFile, type CoverageFile } from "./coverage-file";
import { coverageBody } from "./coverage-payload";
import {
  createCity,
  createCountry,
  deleteCity,
  deleteCountry,
  listAllCities,
  listAllCountries,
  saveCityCoverage,
  updateCity,
  updateCountry,
} from "./locations-api";
import type {
  CityDto,
  CountryDto,
  StoreCityBody,
  StoreCountryBody,
  UpdateCityBody,
  UpdateCountryBody,
} from "./types";

const LOCATIONS_STALE_MS = 5 * 60 * 1000;
const COVERAGE_GC_MS = 30 * 60 * 1000;

export function useAllCities({ enabled = true }: { enabled?: boolean } = {}) {
  const allowed = useHasPermission(PERMISSIONS.TECHNICAL_VIEW);
  return useQuery({
    queryKey: queryKeys.cities(),
    queryFn: listAllCities,
    staleTime: LOCATIONS_STALE_MS,
    enabled: allowed && enabled,
  });
}

export function useAllCountries({ enabled = true }: { enabled?: boolean } = {}) {
  const allowed = useHasPermission(PERMISSIONS.TECHNICAL_VIEW);
  return useQuery({
    queryKey: queryKeys.countries(),
    queryFn: listAllCountries,
    staleTime: LOCATIONS_STALE_MS,
    enabled: allowed && enabled,
  });
}

export function coverageFileQueryOptions(tilesUrl: string | null) {
  return queryOptions({
    queryKey: queryKeys.coverageFile(tilesUrl ?? ""),
    queryFn: ({ signal }) => fetchCoverageFile(tilesUrl!, signal),
    enabled: Boolean(tilesUrl),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: COVERAGE_GC_MS,
    structuralSharing: false,
    retry: false,
  });
}

export function useCoverageFile(tilesUrl: string | null) {
  return useQuery(coverageFileQueryOptions(tilesUrl));
}

function useInvalidateLocations() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.cities() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.countries() }),
    ]);
}

export function useCreateCountry() {
  const invalidate = useInvalidateLocations();
  return useMutation({ mutationFn: (body: StoreCountryBody) => createCountry(body), onSuccess: invalidate });
}

export function useUpdateCountry() {
  const invalidate = useInvalidateLocations();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateCountryBody }) => updateCountry(id, body),
    onSuccess: invalidate,
  });
}

export function useDeleteCountry() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateLocations();
  return useMutation({
    mutationFn: (id: number) => deleteCountry(id),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<CountryDto[]>(queryKeys.countries(), (countries) => countries?.filter((country) => country.id !== id));
      void invalidate();
    },
  });
}

export function useCreateCity() {
  const invalidate = useInvalidateLocations();
  return useMutation({ mutationFn: (body: StoreCityBody) => createCity(body), onSuccess: invalidate });
}

export function useUpdateCity() {
  const invalidate = useInvalidateLocations();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateCityBody }) => updateCity(id, body),
    onSuccess: invalidate,
  });
}

export function useDeleteCity() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateLocations();
  return useMutation({
    mutationFn: (id: number) => deleteCity(id),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<CityDto[]>(queryKeys.cities(), (cities) => cities?.filter((city) => city.id !== id));
      void invalidate();
    },
  });
}

export interface SaveCoverageInput {
  id: number;
  codes: string[];
  centre: LngLat;
}

function coverageFolder(tilesUrl: string): string {
  return tilesUrl.replace(/\/[^/]*$/, "/");
}

export function useSaveCityCoverage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, codes, centre }: SaveCoverageInput) => saveCityCoverage(id, coverageBody(codes, centre)),
    onSuccess: async (result, { id, codes, centre }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cities() });
      if (result.tiles_url) {
        const savedUrl = result.tiles_url;
        const folder = coverageFolder(savedUrl);
        queryClient.removeQueries({
          type: "inactive",
          predicate: (query) => {
            const [scope, url] = query.queryKey;
            return scope === queryKeys.coverageFile("")[0] && typeof url === "string" && url !== savedUrl && coverageFolder(url) === folder;
          },
        });
        const file: CoverageFile = { version: result.tiles_version, codes };
        queryClient.setQueryData(queryKeys.coverageFile(savedUrl), file);
      }
      queryClient.setQueryData<CityDto[]>(queryKeys.cities(), (cities) =>
        cities?.map((city) =>
          city.id === id
            ? {
                ...city,
                tiles_url: result.tiles_url,
                tiles_version: result.tiles_version,
                is_active: result.is_active,
                center: { lat: centre[1], lng: centre[0] },
                updated_at: new Date().toISOString(),
              }
            : city,
        ),
      );
    },
  });
}
