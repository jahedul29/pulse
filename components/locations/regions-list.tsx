"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { DataTable, toolbarIconButtonClass } from "@/components/common/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { apiErrorMessage } from "@/lib/api/error-message";
import { PERMISSIONS, useHasPermission } from "@/lib/auth/permissions";
import { regionBody, regionFormValues } from "@/lib/locations/forms";
import { localizedName } from "@/lib/locations/names";
import { useAllCities, useCreateCity, useDeleteCity, useUpdateCity } from "@/lib/locations/queries";
import { parseRouteId, regionHref } from "@/lib/locations/routes";
import { useRetained } from "@/lib/use-retained";
import type { RegionForm } from "@/lib/locations/schemas";
import type { CityDto } from "@/lib/locations/types";
import { DeleteLocationDialog } from "./delete-location-dialog";
import { useRegionColumns } from "./region-columns";
import { RegionFormDialog } from "./region-form-dialog";
import { useCountryOptions } from "./use-country-options";

type DialogState = { mode: "create" } | { mode: "edit"; region: CityDto };

export function RegionsList() {
  const t = useTranslations("locations.regions");
  const tc = useTranslations("common");
  const te = useTranslations("apiErrors");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const countryParam = parseRouteId(searchParams.get("country"));
  const canEdit = useHasPermission(PERMISSIONS.TECHNICAL_EDIT);
  const citiesQuery = useAllCities();
  const { countriesQuery, countryNames, countryOptions } = useCountryOptions();
  const createCity = useCreateCity();
  const updateCity = useUpdateCity();
  const deleteCity = useDeleteCity();
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [deleting, setDeleting] = useState<CityDto | null>(null);
  const shownDialog = useRetained(dialog);
  const shownDeleting = useRetained(deleting);

  const nameOf = useCallback(
    (region: CityDto) => localizedName(region.name, region.name_translations, locale),
    [locale],
  );
  const openEdit = useCallback((region: CityDto) => setDialog({ mode: "edit", region }), []);
  const openDelete = useCallback((region: CityDto) => setDeleting(region), []);

  const columns = useRegionColumns({ countryNames, canEdit, onEdit: openEdit, onDelete: openDelete });

  const submit = async (values: RegionForm) => {
    if (createCity.isPending || updateCity.isPending || !dialog) return;
    try {
      if (dialog.mode === "edit") {
        await updateCity.mutateAsync({ id: dialog.region.id, body: regionBody(values, true) });
        toast.success(t("savedToast", { name: values.nameEn.trim() }));
        setDialog(null);
        return;
      }
      const created = await createCity.mutateAsync(regionBody(values, false));
      toast.success(t("createdToast", { name: values.nameEn.trim() }));
      setDialog(null);
      router.push(regionHref(created.id));
    } catch (error) {
      toast.error(apiErrorMessage(error, te));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const target = deleting;
    try {
      await deleteCity.mutateAsync(target.id);
      toast.success(t("deletedToast", { name: nameOf(target) }));
      setDeleting(null);
    } catch (error) {
      toast.error(apiErrorMessage(error, te));
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {(citiesQuery.isError && !citiesQuery.data) || (countriesQuery.isError && !countriesQuery.data) ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-sm text-muted-foreground">{t("loadError")}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (citiesQuery.isError) void citiesQuery.refetch();
                  if (countriesQuery.isError) void countriesQuery.refetch();
                }}
              >
                {tc("retry")}
              </Button>
            </div>
          ) : citiesQuery.isPending || countriesQuery.isPending ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={index} className="h-11 w-full" />
              ))}
            </div>
          ) : (
            <TooltipProvider>
              <DataTable
                key={countryParam ?? "all"}
                columns={columns}
                data={citiesQuery.data ?? []}
                initialColumnFilters={countryParam ? [{ id: "country", value: [String(countryParam)] }] : undefined}
                searchPlaceholder={t("search")}
                emptyLabel={t("empty")}
                itemsLabel={t("items")}
                pageSize={25}
                onRowClick={(region) => router.push(regionHref(region.id))}
                rowAriaLabel={(region) => t("openBuilderNamed", { name: nameOf(region) })}
                getSearchText={(region) =>
                  [
                    localizedName(region.name, region.name_translations, "en"),
                    region.name_translations?.ar ?? "",
                    region.code ?? "",
                    countryNames.get(region.country_id) ?? "",
                  ].join(" ")
                }
                filterLabels={{ filter: t("filter"), clear: t("clear"), clearFilters: tc("clearFilters"), search: t("search") }}
                enableFreeze
                maxFreeze={1}
                toolbar={
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          size="lg"
                          onClick={() => setDialog({ mode: "create" })}
                          focusableWhenDisabled
                          disabled={!canEdit}
                          aria-label={t("newRegion")}
                          className={toolbarIconButtonClass}
                        />
                      }
                    >
                      <Plus className="size-4" />
                      <span className="hidden sm:inline">{t("newRegion")}</span>
                    </TooltipTrigger>
                    <TooltipContent>{canEdit ? t("newRegion") : tc("noPermission")}</TooltipContent>
                  </Tooltip>
                }
              />
            </TooltipProvider>
          )}
        </CardContent>
      </Card>
      <RegionFormDialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open && !createCity.isPending && !updateCity.isPending) setDialog(null);
        }}
        mode={shownDialog?.mode ?? "create"}
        initialValues={regionFormValues(shownDialog?.mode === "edit" ? shownDialog.region : null, countryParam)}
        countryOptions={countryOptions}
        submitting={createCity.isPending || updateCity.isPending}
        onSubmit={(values) => void submit(values)}
      />
      <DeleteLocationDialog
        open={deleting !== null}
        title={t("deleteTitle")}
        body={shownDeleting ? t("deleteBody", { name: nameOf(shownDeleting) }) : ""}
        confirmLabel={t("deleteConfirm")}
        pending={deleteCity.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
