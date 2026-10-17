"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { DataTable, toolbarIconButtonClass } from "@/components/common/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { apiErrorMessage } from "@/lib/api/error-message";
import { PERMISSIONS, useHasPermission } from "@/lib/auth/permissions";
import { fmtCount, fmtDateTimeParts } from "@/lib/format";
import { countryBody, countryFormValues } from "@/lib/locations/forms";
import { alternateName, localizedName } from "@/lib/locations/names";
import { useAllCities, useAllCountries, useCreateCountry, useDeleteCountry, useUpdateCountry } from "@/lib/locations/queries";
import { countryRegionsHref } from "@/lib/locations/routes";
import type { CountryForm } from "@/lib/locations/schemas";
import type { CountryDto } from "@/lib/locations/types";
import { useRetained } from "@/lib/use-retained";
import { CountryFormDialog } from "./country-form-dialog";
import { DeleteLocationDialog } from "./delete-location-dialog";
import { LocationRowActions } from "./location-row-actions";
import { firstError, LoadError } from "@/components/common/load-error";

type DialogState = { mode: "create" } | { mode: "edit"; country: CountryDto };

export function CountriesList() {
  const t = useTranslations("locations.countries");
  const tc = useTranslations("common");
  const te = useTranslations("apiErrors");
  const locale = useLocale();
  const router = useRouter();
  const canEdit = useHasPermission(PERMISSIONS.TECHNICAL_EDIT);
  const countriesQuery = useAllCountries();
  const citiesQuery = useAllCities();
  const createCountry = useCreateCountry();
  const updateCountry = useUpdateCountry();
  const deleteCountry = useDeleteCountry();
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [deleting, setDeleting] = useState<CountryDto | null>(null);
  const shownDialog = useRetained(dialog);
  const shownDeleting = useRetained(deleting);

  const regionCounts = useMemo(() => {
    if (!citiesQuery.data) return null;
    const counts = new Map<number, number>();
    for (const city of citiesQuery.data) counts.set(city.country_id, (counts.get(city.country_id) ?? 0) + 1);
    return counts;
  }, [citiesQuery.data]);

  const regionCount = useCallback(
    (country: CountryDto) => (regionCounts ? (regionCounts.get(country.id) ?? 0) : null),
    [regionCounts],
  );

  const nameOf = useCallback(
    (country: CountryDto) => localizedName(country.name, country.name_translations, locale),
    [locale],
  );

  const columns = useMemo<ColumnDef<CountryDto, unknown>[]>(
    () => [
      {
        id: "country",
        accessorFn: nameOf,
        size: 280,
        header: t("colCountry"),
        cell: ({ row }) => {
          const other = alternateName(row.original.name, row.original.name_translations, locale);
          return (
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-medium">{nameOf(row.original)}</span>
              {other ? (
                <span className="truncate text-xs text-muted-foreground" dir="auto">
                  {other}
                </span>
              ) : null}
            </span>
          );
        },
      },
      {
        id: "code",
        accessorFn: (country) => country.code,
        size: 110,
        header: t("colCode"),
        cell: ({ row }) => <span className="tabular text-sm">{row.original.code}</span>,
      },
      {
        id: "regions",
        accessorFn: (country) => regionCount(country) ?? -1,
        size: 140,
        header: t("colRegions"),
        cell: ({ row }) => {
          const count = regionCount(row.original);
          return (
            <span className="tabular text-sm text-muted-foreground">
              {count === null ? "-" : t("regionCount", { count, formatted: fmtCount(count, locale) })}
            </span>
          );
        },
      },
      {
        id: "active",
        accessorFn: (country) => (country.is_active === false ? "0" : "1"),
        enableSorting: false,
        size: 130,
        header: t("colStatus"),
        meta: {
          filter: "select",
          filterOptions: [
            { value: "1", label: t("active") },
            { value: "0", label: t("inactive") },
          ],
          filterLabel: t("colStatus"),
        },
        cell: ({ row }) => (
          <StatusBadge tone={row.original.is_active === false ? "neutral" : "success"} equalWidth={false} className="min-w-[5.5rem]">
            {row.original.is_active === false ? t("inactive") : t("active")}
          </StatusBadge>
        ),
      },
      {
        id: "created",
        accessorFn: (country) => (country.created_at ? new Date(country.created_at).getTime() : 0),
        size: 140,
        header: t("colCreated"),
        cell: ({ row }) => (
          <span className="tabular text-xs text-muted-foreground">
            {row.original.created_at ? fmtDateTimeParts(new Date(row.original.created_at).getTime(), locale).date : "-"}
          </span>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        size: 110,
        header: "",
        meta: { headClassName: "text-end", cellClassName: "text-end", noClip: true },
        cell: ({ row }) => {
          const name = nameOf(row.original);
          const count = regionCount(row.original);
          return (
            <LocationRowActions
              name={name}
              canEdit={canEdit}
              editLabel={t("edit")}
              deleteLabel={t("delete")}
              editAriaLabel={t("editNamed", { name })}
              deleteAriaLabel={t("deleteNamed", { name })}
              deleteBlockedReason={count === null ? t("deleteChecking") : count > 0 ? t("deleteBlocked") : null}
              onEdit={() => setDialog({ mode: "edit", country: row.original })}
              onDelete={() => setDeleting(row.original)}
            />
          );
        },
      },
    ],
    [canEdit, locale, nameOf, regionCount, t],
  );

  const submit = async (values: CountryForm) => {
    if (createCountry.isPending || updateCountry.isPending || !dialog) return;
    try {
      if (dialog.mode === "edit") {
        await updateCountry.mutateAsync({ id: dialog.country.id, body: countryBody(values) });
        toast.success(t("savedToast", { name: values.nameEn.trim() }));
      } else {
        await createCountry.mutateAsync(countryBody(values));
        toast.success(t("createdToast", { name: values.nameEn.trim() }));
      }
      setDialog(null);
    } catch (error) {
      toast.error(apiErrorMessage(error, te));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const target = deleting;
    try {
      await deleteCountry.mutateAsync(target.id);
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
          {(countriesQuery.isError && !countriesQuery.data) || (citiesQuery.isError && !citiesQuery.data) ? (
            <LoadError
              error={firstError(countriesQuery.error, citiesQuery.error)}
              message={t("loadError")}
              onRetry={() => {
                if (countriesQuery.isError) void countriesQuery.refetch();
                if (citiesQuery.isError) void citiesQuery.refetch();
              }}
            />
          ) : countriesQuery.isPending ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={index} className="h-11 w-full" />
              ))}
            </div>
          ) : (
            <TooltipProvider>
              <DataTable
                columns={columns}
                data={countriesQuery.data ?? []}
                searchPlaceholder={t("search")}
                emptyLabel={t("empty")}
                itemsLabel={t("items")}
                pageSize={25}
                onRowClick={(country) => router.push(countryRegionsHref(country.id))}
                rowAriaLabel={(country) => t("viewRegionsNamed", { name: nameOf(country) })}
                getSearchText={(country) => {
                  const names = [localizedName(country.name, country.name_translations, "en"), country.name_translations?.ar ?? ""];
                  return [...names, country.code].join(" ");
                }}
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
                          aria-label={t("newCountry")}
                          className={toolbarIconButtonClass}
                        />
                      }
                    >
                      <Plus className="size-4" />
                      <span className="hidden sm:inline">{t("newCountry")}</span>
                    </TooltipTrigger>
                    <TooltipContent>{canEdit ? t("newCountry") : tc("noPermission")}</TooltipContent>
                  </Tooltip>
                }
              />
            </TooltipProvider>
          )}
        </CardContent>
      </Card>
      <CountryFormDialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open && !createCountry.isPending && !updateCountry.isPending) setDialog(null);
        }}
        mode={shownDialog?.mode ?? "create"}
        initialValues={countryFormValues(shownDialog?.mode === "edit" ? shownDialog.country : null)}
        submitting={createCountry.isPending || updateCountry.isPending}
        onSubmit={(values) => void submit(values)}
      />
      <DeleteLocationDialog
        open={deleting !== null}
        title={t("deleteTitle")}
        body={shownDeleting ? t("deleteBody", { name: nameOf(shownDeleting) }) : ""}
        confirmLabel={t("deleteConfirm")}
        pending={deleteCountry.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
