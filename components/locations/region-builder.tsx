"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueries } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { apiErrorMessage } from "@/lib/api/error-message";
import { PERMISSIONS, useHasPermission } from "@/lib/auth/permissions";
import type { CoverageFile } from "@/lib/locations/coverage-file";
import { regionBody, regionFormValues } from "@/lib/locations/forms";
import { alternateName, localizedName } from "@/lib/locations/names";
import {
  coverageFileQueryOptions,
  useAllCities,
  useCoverageFile,
  useCreateCity,
  useDeleteCity,
  useSaveCityCoverage,
  useUpdateCity,
} from "@/lib/locations/queries";
import { parseRouteId, REGIONS_PATH, regionHref } from "@/lib/locations/routes";
import type { RegionForm } from "@/lib/locations/schemas";
import type { CityDto } from "@/lib/locations/types";
import type { LngLat } from "@/lib/mgrs/grid";
import { nearestNeighbours } from "@/lib/region-builder/neighbours";
import { useRetained } from "@/lib/use-retained";
import { cn } from "@/lib/utils";
import { FULL_BLEED_HEIGHT } from "./full-bleed";
import { RegionEditor } from "./region-editor/region-editor";
import { StageState } from "./region-editor/stage-state";
import { RegionFormDialog } from "./region-form-dialog";
import { useCountryOptions } from "./use-country-options";

const DEFAULT_COUNTRY_CODE = "AE";
const SAVING_VERSION = Number.MAX_SAFE_INTEGER;

interface Baseline {
  regionId: number;
  version: number;
  tilesUrl: string | null;
}

function pickCoverageData(results: Array<{ data?: CoverageFile }>): Array<CoverageFile | undefined> {
  return results.map((result) => result.data);
}

function bySortOrder(first: CityDto, second: CityDto): number {
  return (first.sort_order ?? 0) - (second.sort_order ?? 0) || first.id - second.id;
}

function defaultRegion(cities: CityDto[], countryId: number | null): CityDto | null {
  const pool = [...cities].sort(bySortOrder);
  const inCountry = pool.filter((city) => city.country_id === countryId);
  return inCountry.find((city) => city.tiles_url) ?? inCountry[0] ?? pool.find((city) => city.tiles_url) ?? pool[0] ?? null;
}

function FullBleed({ children }: { children: ReactNode }) {
  return (
    <div data-full-bleed className={cn("relative", FULL_BLEED_HEIGHT)}>
      {children}
    </div>
  );
}

export function RegionBuilder() {
  const t = useTranslations("locations.editor");
  const tr = useTranslations("locations.regions");
  const te = useTranslations("apiErrors");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const canEdit = useHasPermission(PERMISSIONS.TECHNICAL_EDIT);
  const citiesQuery = useAllCities();
  const { countriesQuery, countryOptions } = useCountryOptions();
  const createCity = useCreateCity();
  const updateCity = useUpdateCity();
  const deleteCity = useDeleteCity();
  const saveCoverage = useSaveCityCoverage();
  const [dialog, setDialog] = useState<"edit" | "create" | null>(null);
  const shownDialog = useRetained(dialog);
  const [chosenCountry, setChosenCountry] = useState<{ regionId: number | null; countryId: number } | null>(null);
  const [baseline, setBaseline] = useState<Baseline | null>(null);
  const [reloads, setReloads] = useState(0);
  const [deletedId, setDeletedId] = useState<number | null>(null);

  const cities = useMemo(() => citiesQuery.data ?? [], [citiesQuery.data]);
  const countries = useMemo(() => countriesQuery.data ?? [], [countriesQuery.data]);
  const requestedId = parseRouteId(searchParams.get("region"));
  const region = requestedId === null ? null : (cities.find((city) => city.id === requestedId) ?? null);
  const uaeId = countries.find((country) => country.code === DEFAULT_COUNTRY_CODE)?.id ?? null;
  const fallbackRegion = useMemo(
    () => (requestedId === null && citiesQuery.isSuccess && countriesQuery.isSuccess ? defaultRegion(cities, uaeId) : null),
    [cities, citiesQuery.isSuccess, countriesQuery.isSuccess, requestedId, uaeId],
  );

  useEffect(() => {
    if (fallbackRegion) router.replace(regionHref(fallbackRegion.id));
  }, [fallbackRegion, router]);

  useEffect(() => {
    if (citiesQuery.isRefetchError || countriesQuery.isRefetchError) toast.error(tr("loadError"));
  }, [citiesQuery.isRefetchError, countriesQuery.isRefetchError, tr]);

  if (deletedId !== null && requestedId !== deletedId) setDeletedId(null);

  const regionId = region?.id ?? null;
  const countryId =
    (chosenCountry && chosenCountry.regionId === regionId ? chosenCountry.countryId : null) ??
    region?.country_id ??
    uaeId ??
    countries[0]?.id ??
    null;
  const countryRegions = useMemo(
    () => cities.filter((city) => city.country_id === countryId).sort(bySortOrder),
    [cities, countryId],
  );

  if (region && baseline?.regionId !== region.id) {
    setBaseline({ regionId: region.id, version: region.tiles_version, tilesUrl: region.tiles_url });
  }
  const pinned = region && baseline?.regionId === region.id ? baseline : null;
  const conflict = Boolean(region && pinned && region.tiles_version > pinned.version);
  const tilesUrl = pinned ? pinned.tilesUrl : (region?.tiles_url ?? null);

  const coverageQuery = useCoverageFile(tilesUrl);
  const others = useMemo(() => (region ? nearestNeighbours(region, cities) : []), [cities, region]);
  const otherData = useQueries({
    queries: others.map((city) => ({
      ...coverageFileQueryOptions(city.tiles_url),
      enabled: Boolean(city.tiles_url) && (coverageQuery.isSuccess || !tilesUrl),
    })),
    combine: pickCoverageData,
  });
  const otherRegions = useMemo(
    () =>
      others.flatMap((city, index) => {
        const file = otherData[index];
        return file ? [{ id: city.id, name: localizedName(city.name, city.name_translations, locale), codes: file.codes }] : [];
      }),
    [others, locale, otherData],
  );

  const submitDetails = async (values: RegionForm) => {
    if (createCity.isPending || updateCity.isPending) return;
    try {
      if (dialog === "edit" && region) {
        const updated = await updateCity.mutateAsync({ id: region.id, body: regionBody(values, true) });
        setBaseline((current) =>
          current && current.regionId === updated.id && updated.tiles_version > current.version
            ? { ...current, version: updated.tiles_version, tilesUrl: updated.tiles_url }
            : current,
        );
        toast.success(tr("savedToast", { name: values.nameEn.trim() }));
        setDialog(null);
        return;
      }
      const created = await createCity.mutateAsync(regionBody(values, false));
      toast.success(tr("createdToast", { name: values.nameEn.trim() }));
      setDialog(null);
      router.push(regionHref(created.id));
    } catch (error) {
      toast.error(apiErrorMessage(error, te));
    }
  };

  const save = async ({ codes, centre }: { codes: string[]; centre: LngLat }) => {
    if (!region || !pinned) return false;
    const previous = pinned;
    setBaseline({ ...previous, version: SAVING_VERSION });
    try {
      const result = await saveCoverage.mutateAsync({ id: region.id, codes, centre });
      setBaseline({ regionId: region.id, version: result.tiles_version, tilesUrl: result.tiles_url });
      return true;
    } catch (error) {
      setBaseline(previous);
      toast.error(t("saveFailed"), { description: apiErrorMessage(error, te) });
      return false;
    }
  };

  const remove = async () => {
    if (!region) return false;
    const target = region;
    setDeletedId(target.id);
    try {
      await deleteCity.mutateAsync(target.id);
      toast.success(tr("deletedToast", { name: localizedName(target.name, target.name_translations, locale) }));
      const next = cities.filter((city) => city.id !== target.id && city.country_id === target.country_id).sort(bySortOrder)[0];
      router.replace(next ? regionHref(next.id) : REGIONS_PATH);
      return true;
    } catch (error) {
      setDeletedId(null);
      toast.error(apiErrorMessage(error, te));
      return false;
    }
  };

  const formDialog = (
    <RegionFormDialog
      open={dialog !== null}
      onOpenChange={(open) => {
        if (!open && !createCity.isPending && !updateCity.isPending) setDialog(null);
      }}
      mode={shownDialog ?? "create"}
      initialValues={regionFormValues(shownDialog === "edit" ? region : null, countryId)}
      countryOptions={countryOptions}
      submitting={createCity.isPending || updateCity.isPending}
      onSubmit={(values) => void submitDetails(values)}
    />
  );

  if ((citiesQuery.isError && !citiesQuery.data) || (countriesQuery.isError && !countriesQuery.data)) {
    return (
      <FullBleed>
        <StageState
          message={tr("loadError")}
          onRetry={() => {
            if (citiesQuery.isError) void citiesQuery.refetch();
            if (countriesQuery.isError) void countriesQuery.refetch();
          }}
        />
      </FullBleed>
    );
  }

  if (!region) {
    const loaded = citiesQuery.isSuccess && countriesQuery.isSuccess;
    const leaving = requestedId !== null && requestedId === deletedId;
    const missing = loaded && requestedId !== null && !leaving;
    const empty = loaded && requestedId === null && cities.length === 0;
    return (
      <FullBleed>
        <StageState
          message={missing ? t("notFound") : empty ? t("noRegionsYet") : t("loadingCells")}
          loading={!missing && !empty}
          action={
            missing ? (
              <Link href={REGIONS_PATH} className={buttonVariants({ variant: "outline", size: "sm" })}>
                {t("openRegions")}
              </Link>
            ) : empty && canEdit ? (
              <Button size="sm" onClick={() => setDialog("create")}>
                <Plus className="size-4" />
                {t("newRegion")}
              </Button>
            ) : null
          }
        />
        {formDialog}
      </FullBleed>
    );
  }

  const coverageCodes = tilesUrl ? (coverageQuery.data?.codes ?? null) : [];
  const coverageStatus = !tilesUrl ? "ready" : coverageQuery.isError ? "error" : coverageQuery.data ? "ready" : "loading";
  const centre: LngLat | null = region.center ? [region.center.lng, region.center.lat] : null;

  return (
    <>
      <RegionEditor
        key={`${region.id}:${reloads}`}
        region={{
          id: region.id,
          name: localizedName(region.name, region.name_translations, locale),
          alternateName: alternateName(region.name, region.name_translations, locale),
          code: region.code,
          active: region.is_active !== false,
          centre,
          lastSavedAt: region.updated_at ? new Date(region.updated_at).getTime() : null,
        }}
        picker={{
          countries: countryOptions,
          countryId,
          onCountryChange: (id) => setChosenCountry({ regionId, countryId: id }),
          regions: countryRegions.map((city) => ({
            id: city.id,
            label: localizedName(city.name, city.name_translations, locale),
            code: city.code,
            mapped: Boolean(city.tiles_url),
            active: city.is_active !== false,
          })),
          onCreateRegion: () => setDialog("create"),
        }}
        coverage={{ status: coverageStatus, codes: coverageCodes, onRetry: () => void coverageQuery.refetch() }}
        otherRegions={otherRegions}
        canEdit={canEdit}
        conflict={conflict}
        onReload={() => {
          setBaseline({ regionId: region.id, version: region.tiles_version, tilesUrl: region.tiles_url });
          setReloads((count) => count + 1);
        }}
        onSave={save}
        onSwitchRegion={(id) => router.replace(regionHref(id))}
        onEditDetails={() => setDialog("edit")}
        onDeleteRegion={remove}
      />
      {formDialog}
    </>
  );
}
