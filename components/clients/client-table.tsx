"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatusBadge, accountTone } from "@/components/common/status-badge";
import { DataTable } from "@/components/common/data-table";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { ClientRowActions } from "@/components/clients/client-row-actions";
import { useClientStore } from "@/lib/store";
import { fmtDate } from "@/lib/format";
import { Money } from "@/components/common/money";
import type { Client } from "@/lib/types";

export function ClientTable() {
  const t = useTranslations("clients");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const clients = useClientStore((s) => s.clients);
  const [addOpen, setAddOpen] = useState(false);

  const columns = useMemo<ColumnDef<Client, unknown>[]>(
    () => [
      {
        accessorKey: "fullName",
        header: t("colClient"),
        size: 240,
        filterFn: "includesString",
        meta: { filter: "text", filterLabel: t("colClient") },
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex items-center gap-3">
              <Avatar className="size-8">
                <AvatarFallback className="bg-accent text-xs font-medium text-accent-foreground">
                  {c.initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <span className="block truncate font-medium">{c.fullName}</span>
                <span className="block truncate font-mono text-xs text-muted-foreground">
                  {c.refCode}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "region",
        header: t("colRegion"),
        size: 160,
        meta: { filter: "select", filterLabel: t("colRegion") },
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.region}</span>,
      },
      {
        accessorKey: "status",
        header: t("colStatus"),
        size: 170,
        meta: {
          filter: "select",
          filterLabel: t("colStatus"),
          filterOptions: ["active", "suspended", "deleted"].map((s) => ({
            value: s,
            label: t(`status.${s}`),
          })),
        },
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex items-center gap-1.5">
              <StatusBadge tone={accountTone(c.status)}>{t(`status.${c.status}`)}</StatusBadge>
              {c.activePackage && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                  {t("pkg")}
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: "profiles",
        accessorFn: (c) => c.profiles.length,
        header: t("colProfiles"),
        filterFn: "inNumberRange",
        cell: ({ row }) => <span className="font-mono tabular">{row.original.profiles.length}</span>,
        meta: { headClassName: "text-end", cellClassName: "text-end", filter: "range", filterLabel: t("colProfiles") },
      },
      {
        id: "wallet",
        accessorFn: (c) => c.wallet.balance,
        header: t("colWallet"),
        filterFn: "inNumberRange",
        cell: ({ row }) => <Money value={row.original.wallet.balance} className="font-mono" />,
        meta: { headClassName: "text-end", cellClassName: "text-end", filter: "range", filterLabel: t("colWallet") },
      },
      {
        accessorKey: "joinedAt",
        header: t("colJoined"),
        cell: ({ row }) => (
          <span className="font-mono text-xs tabular text-muted-foreground">
            {fmtDate(row.original.joinedAt, locale)}
          </span>
        ),
        meta: { headClassName: "text-end", cellClassName: "text-end" },
      },
      {
        id: "actions",
        header: t("colActions"),
        enableSorting: false,
        cell: ({ row }) => <ClientRowActions client={row.original} />,
        meta: { headClassName: "text-end", cellClassName: "text-end" },
      },
    ],
    [t, locale],
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={clients}
        searchPlaceholder={t("searchPlaceholder")}
        emptyLabel={t("tableEmpty")}
        itemsLabel={t("itemsLabel")}
        getSearchText={(c) => `${c.fullName} ${c.email} ${c.refCode} ${c.region}`}
        filterLabels={{ filter: tc("filter"), clear: tc("clear"), min: tc("min"), max: tc("max") }}
        enableFreeze
        maxFreeze={3}
        freezeLabels={{ label: tc("freeze") }}
        onRowClick={(c) => router.push(`/clients/${c.id}`)}
        rowAriaLabel={(c) => t("openAria", { name: c.fullName })}
        toolbar={
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus />
            {t("newClient")}
          </Button>
        }
      />
      <ClientFormDialog mode="add" open={addOpen} onOpenChange={setAddOpen} />
    </>
  );
}
