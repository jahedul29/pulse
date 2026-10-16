"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useLocale, useTranslations } from "next-intl";
import { StatusBadge } from "@/components/common/status-badge";
import { fmtCount, fmtDateTimeParts } from "@/lib/format";
import { alternateName, localizedName } from "@/lib/locations/names";
import type { CityDto } from "@/lib/locations/types";
import { LocationRowActions } from "./location-row-actions";

export function useRegionColumns({
  countryNames,
  canEdit,
  onEdit,
  onDelete,
}: {
  countryNames: Map<number, string>;
  canEdit: boolean;
  onEdit: (region: CityDto) => void;
  onDelete: (region: CityDto) => void;
}): ColumnDef<CityDto, unknown>[] {
  const t = useTranslations("locations.regions");
  const locale = useLocale();

  return useMemo<ColumnDef<CityDto, unknown>[]>(
    () => [
      {
        id: "region",
        accessorFn: (region) => localizedName(region.name, region.name_translations, locale),
        size: 260,
        header: t("colRegion"),
        cell: ({ row }) => {
          const other = alternateName(row.original.name, row.original.name_translations, locale);
          return (
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-medium">
                {localizedName(row.original.name, row.original.name_translations, locale)}
              </span>
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
        accessorFn: (region) => region.code ?? "",
        size: 110,
        header: t("colCode"),
        cell: ({ row }) => <span className="tabular text-sm">{row.original.code || "-"}</span>,
      },
      {
        id: "country",
        accessorFn: (region) => String(region.country_id),
        sortingFn: (first, second) =>
          (countryNames.get(first.original.country_id) ?? "").localeCompare(countryNames.get(second.original.country_id) ?? "", locale),
        size: 200,
        header: t("colCountry"),
        meta: {
          filter: "select",
          filterOptions: [...countryNames.entries()].map(([id, name]) => ({ value: String(id), label: name })),
          filterLabel: t("colCountry"),
        },
        cell: ({ row }) => <span className="truncate">{countryNames.get(row.original.country_id) ?? "-"}</span>,
      },
      {
        id: "map",
        accessorFn: (region) => (region.tiles_url ? "1" : "0"),
        enableSorting: false,
        size: 190,
        header: t("colMap"),
        meta: {
          filter: "select",
          filterOptions: [
            { value: "1", label: t("mapped") },
            { value: "0", label: t("notMapped") },
          ],
          filterLabel: t("colMap"),
        },
        cell: ({ row }) =>
          row.original.tiles_url ? (
            <span className="flex items-center gap-2">
              <StatusBadge tone="success" equalWidth={false} className="min-w-[6.5rem]">
                {t("mapped")}
              </StatusBadge>
              <span className="tabular text-xs text-muted-foreground">
                {t("mapVersion", { version: fmtCount(row.original.tiles_version, locale) })}
              </span>
            </span>
          ) : (
            <StatusBadge tone="warning" equalWidth={false} className="min-w-[6.5rem]">
              {t("notMapped")}
            </StatusBadge>
          ),
      },
      {
        id: "active",
        accessorFn: (region) => (region.is_active === false ? "0" : "1"),
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
        id: "updated",
        accessorFn: (region) => (region.updated_at ? new Date(region.updated_at).getTime() : 0),
        size: 140,
        header: t("colUpdated"),
        cell: ({ row }) => (
          <span className="tabular text-xs text-muted-foreground">
            {row.original.updated_at ? fmtDateTimeParts(new Date(row.original.updated_at).getTime(), locale).date : "-"}
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
          const name = localizedName(row.original.name, row.original.name_translations, locale);
          return (
            <LocationRowActions
              name={name}
              canEdit={canEdit}
              editLabel={t("edit")}
              deleteLabel={t("delete")}
              editAriaLabel={t("editNamed", { name })}
              deleteAriaLabel={t("deleteNamed", { name })}
              onEdit={() => onEdit(row.original)}
              onDelete={() => onDelete(row.original)}
            />
          );
        },
      },
    ],
    [canEdit, countryNames, locale, onDelete, onEdit, t],
  );
}
