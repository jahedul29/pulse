"use client";

import { useMemo } from "react";
import { CalendarClock } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { DataTable } from "@/components/common/data-table";
import { ProfileCell } from "@/components/common/profile-cell";
import { cn } from "@/lib/utils";
import { ROLE_BADGE, useSpecialistStore, type Specialist } from "@/lib/specialists";

export function SpecialistsTable() {
  const t = useTranslations();
  const specialists = useSpecialistStore((s) => s.specialists);

  const columns = useMemo<ColumnDef<Specialist, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: t("personnel.colSpecialist"),
        size: 260,
        filterFn: "includesString",
        meta: { filter: "text", filterLabel: t("personnel.colSpecialist") },
        cell: ({ row }) => (
          <ProfileCell
            name={row.original.name}
            initials={row.original.initials}
            subtitle={row.original.email}
          />
        ),
      },
      {
        accessorKey: "role",
        header: t("personnel.colRole"),
        size: 160,
        meta: {
          filter: "select",
          filterLabel: t("personnel.colRole"),
          filterOptions: ["therapist", "analyst"].map((r) => ({
            value: r,
            label: t(`common.role.${r}`),
          })),
        },
        cell: ({ row }) => (
          <span
            className={cn(
              "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium min-w-[var(--badge-w)]",
              ROLE_BADGE[row.original.role],
            )}
          >
            {t(`common.role.${row.original.role}`)}
          </span>
        ),
      },
      {
        id: "businessHours",
        accessorFn: (s) => (s.defined ? "defined" : "notDefined"),
        header: t("personnel.colBusinessHours"),
        size: 180,
        meta: {
          filter: "select",
          filterLabel: t("personnel.colBusinessHours"),
          filterOptions: [
            { value: "defined", label: t("personnel.defined") },
            { value: "notDefined", label: t("personnel.notDefined") },
          ],
        },
        cell: ({ row }) =>
          row.original.defined ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-foreground">
              <span className="size-1.5 rounded-full bg-success" /> {t("personnel.defined")}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">{t("personnel.notDefined")}</span>
          ),
      },
      {
        id: "action",
        header: t("personnel.colAction"),
        cell: ({ row }) => (
          <Link
            href={`/personnel/${row.original.id}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <CalendarClock className="size-3.5" /> {t("personnel.editAvailability")}
          </Link>
        ),
        meta: { headClassName: "text-end", cellClassName: "text-end" },
      },
    ],
    [t],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("personnel.title")}</CardTitle>
        <CardDescription>{t("personnel.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={specialists}
          searchPlaceholder={t("personnel.searchPlaceholder")}
          emptyLabel={t("personnel.tableEmpty")}
          itemsLabel={t("personnel.itemsLabel")}
          getSearchText={(s) => `${s.name} ${s.email} ${t(`common.role.${s.role}`)}`}
          filterLabels={{
            filter: t("common.filter"),
            clear: t("common.clear"),
            clearFilters: t("common.clearFilters"),
            min: t("common.min"),
            max: t("common.max"),
          }}
          enableFreeze
          maxFreeze={3}
        />
      </CardContent>
    </Card>
  );
}
