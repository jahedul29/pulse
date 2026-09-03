"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DataTable, toolbarIconButtonClass } from "@/components/common/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { ProfileCell } from "@/components/common/profile-cell";
import { DetailList } from "@/components/common/detail-list";
import { fmtDateTimeParts } from "@/lib/format";
import { exportCsv } from "@/lib/export/csv";
import { useNotificationStore } from "@/lib/notifications/store";
import { fetchNotificationLog } from "@/lib/notifications/api";
import { htmlToPlainText } from "@/lib/notifications/variables";
import { useRetained } from "@/lib/use-retained";
import { statusTone } from "@/lib/notifications/tones";
import {
  DELIVERY_STATUSES,
  MESSAGE_CATEGORIES,
  RECIPIENT_ROLES,
} from "@/lib/notifications/types";
import type { NotificationLogEntry } from "@/lib/notifications/types";

export function NotificationLog() {
  const t = useTranslations("notifications");
  const tc = useTranslations("common");
  const locale = useLocale();

  const templatesState = useNotificationStore((state) => state.templates);

  const [rows, setRows] = useState<NotificationLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<NotificationLogEntry | null>(null);
  const shown = useRetained(selected);

  useEffect(() => {
    let active = true;
    fetchNotificationLog()
      .then((result) => {
        if (!active) return;
        setRows(result);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError(true);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const template = useMemo(
    () => (code: string) => templatesState.find((tpl) => tpl.code === code) ?? null,
    [templatesState],
  );

  const columns = useMemo<ColumnDef<NotificationLogEntry, unknown>[]>(
    () => [
      {
        id: "timestamp",
        accessorFn: (entry) => entry.createdAt,
        size: 168,
        header: t("log.colTimestamp"),
        meta: { filter: "dateRange", filterLabel: t("log.colTimestamp") },
        cell: ({ row }) => {
          const { date, time } = fmtDateTimeParts(row.original.createdAt, locale);
          return (
            <span className="text-xs whitespace-nowrap tabular">
              {date} {time}
            </span>
          );
        },
      },
      {
        id: "recipient",
        accessorFn: (entry) => entry.recipientRole,
        size: 220,
        header: t("log.colRecipient"),
        meta: {
          filter: "select",
          filterOptions: RECIPIENT_ROLES.map((role) => ({ value: role, label: t(`roles.${role}`) })),
          filterLabel: t("log.colRecipient"),
        },
        cell: ({ row }) => (
          <ProfileCell name={row.original.recipientName} subtitle={t(`roles.${row.original.recipientRole}`)} />
        ),
      },
      {
        id: "category",
        accessorFn: (entry) => entry.category,
        size: 140,
        header: t("log.colCategory"),
        meta: {
          filter: "select",
          filterOptions: MESSAGE_CATEGORIES.map((category) => ({ value: category, label: t(`categories.${category}`) })),
          filterLabel: t("log.colCategory"),
        },
        cell: ({ row }) => (
          <StatusBadge tone="neutral" equalWidth={false} className="min-w-[8.5rem]">
            {t(`categories.${row.original.category}`)}
          </StatusBadge>
        ),
      },
      {
        id: "template",
        accessorFn: (entry) => entry.templateCode,
        size: 200,
        header: t("log.colTemplate"),
        cell: ({ row }) => <span className="text-xs">{row.original.templateCode}</span>,
      },
      {
        id: "status",
        accessorFn: (entry) => entry.status,
        size: 130,
        header: t("log.colStatus"),
        meta: {
          filter: "select",
          filterOptions: DELIVERY_STATUSES.map((status) => ({ value: status, label: t(`status.${status}`) })),
          filterLabel: t("log.colStatus"),
        },
        cell: ({ row }) => (
          <StatusBadge tone={statusTone(row.original.status)} equalWidth={false} className="min-w-[5.5rem]">
            {t(`status.${row.original.status}`)}
          </StatusBadge>
        ),
      },
    ],
    [t, locale],
  );

  const onExport = (exportRows: NotificationLogEntry[]) => {
    const headers = [
      t("log.colTimestamp"),
      t("log.colRecipient"),
      t("log.colRole"),
      t("log.colCategory"),
      t("log.colTemplate"),
      t("log.colStatus"),
    ];
    const csvRows = exportRows.map((entry) => {
      const { date, time } = fmtDateTimeParts(entry.createdAt, locale);
      return [
        `${date} ${time}`,
        entry.recipientName,
        t(`roles.${entry.recipientRole}`),
        t(`categories.${entry.category}`),
        entry.templateCode,
        t(`status.${entry.status}`),
      ];
    });
    exportCsv("notification-log.csv", headers, csvRows);
  };

  return (
    <div className="mx-auto max-w-7xl">
      <Card>
        <CardHeader>
          <CardTitle>{t("log.title")}</CardTitle>
          <CardDescription>{t("log.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="py-16 text-center text-sm text-muted-foreground">{t("log.loadError")}</p>
          ) : loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={rows}
              pageSize={10}
              searchPlaceholder={t("log.search")}
              emptyLabel={t("log.empty")}
              itemsLabel={t("log.items")}
              onRowClick={(entry) => setSelected(entry)}
              rowAriaLabel={(entry) => `${entry.recipientName} ${entry.templateCode}`}
              getSearchText={(entry) => `${entry.recipientName} ${entry.templateCode} ${entry.category} ${entry.status}`}
              filterLabels={{
                filter: t("log.filter"),
                clear: t("log.clear"),
                clearFilters: tc("clearFilters"),
                search: t("log.filterSearch"),
                from: t("log.dateFrom"),
                to: t("log.dateTo"),
              }}
              enableFreeze
              maxFreeze={2}
              toolbar={(visibleRows) => (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => onExport(visibleRows)}
                        aria-label={t("log.export")}
                        className={toolbarIconButtonClass}
                      />
                    }
                  >
                    <Download className="size-4" />
                    <span className="hidden sm:inline">{t("log.export")}</span>
                  </TooltipTrigger>
                  <TooltipContent>{t("log.export")}</TooltipContent>
                </Tooltip>
              )}
            />
          )}
        </CardContent>
      </Card>

      <Sheet open={selected != null} onOpenChange={(open) => !open && setSelected(null)}>
        {shown && (
          <SheetContent>
            <SheetHeader>
              <SheetTitle>{shown.recipientName}</SheetTitle>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <StatusBadge tone={statusTone(shown.status)} equalWidth={false}>
                  {t(`status.${shown.status}`)}
                </StatusBadge>
                <StatusBadge tone="neutral" equalWidth={false}>
                  {t(`categories.${shown.category}`)}
                </StatusBadge>
              </div>
            </SheetHeader>
            <SheetBody className="flex flex-col gap-4">
              <DetailList
                items={[
                  { label: t("log.colRole"), value: t(`roles.${shown.recipientRole}`) },
                  { label: t("log.colTemplate"), value: shown.templateCode },
                  {
                    label: t("log.colTimestamp"),
                    value: (() => {
                      const { date, time } = fmtDateTimeParts(shown.createdAt, locale);
                      return `${date} ${time}`;
                    })(),
                  },
                ]}
              />
              {(() => {
                const tpl = template(shown.templateCode);
                if (!tpl) return null;
                return (
                  <div className="flex flex-col gap-2">
                    <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      {t("log.messageBody")}
                    </h4>
                    <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                      {htmlToPlainText(tpl.en)}
                    </div>
                    <div dir="rtl" className="rounded-lg border bg-muted/30 p-3 text-sm">
                      {htmlToPlainText(tpl.ar)}
                    </div>
                  </div>
                );
              })()}
            </SheetBody>
          </SheetContent>
        )}
      </Sheet>
    </div>
  );
}
