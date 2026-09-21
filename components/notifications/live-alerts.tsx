"use client";

import { useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DataTable, type ServerTableState } from "@/components/common/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { ProfileCell } from "@/components/common/profile-cell";
import { Chip } from "@/components/common/chip";
import { DetailList } from "@/components/common/detail-list";
import { fmtDateTimeParts } from "@/lib/format";
import { useRetained } from "@/lib/use-retained";
import { useLiveAlerts, useDelivery } from "@/lib/notifications/queries";
import { liveAlertsStateToParams } from "@/lib/notifications/list-params";
import {
  DELIVERY_STATUS_CODES,
  SEVERITY_ORDER,
  deliveryStatusTone,
  recipientName,
  severityTone,
  shortId,
} from "@/lib/notifications/dto";
import type { NotificationDeliveryDto } from "@/lib/notifications/dto";
import { ChannelFilter } from "@/components/notifications/channel-select";
import { AdminUserFilter } from "@/components/admin/admin-user-filter";

export function LiveAlerts() {
  const t = useTranslations("notifications");
  const tc = useTranslations("common");
  const locale = useLocale();

  const [server, setServer] = useState<ServerTableState | null>(null);
  const params = useMemo(() => liveAlertsStateToParams(server), [server]);
  const alertsQuery = useLiveAlerts(params);
  const rows = useMemo(() => alertsQuery.data?.data ?? [], [alertsQuery.data]);
  const total = alertsQuery.data?.meta?.total ?? rows.length;
  const severityCounts = useMemo(() => alertsQuery.data?.severityCounts ?? {}, [alertsQuery.data]);
  const onServerStateChange = useCallback((state: ServerTableState) => setServer(state), []);

  const [selected, setSelected] = useState<NotificationDeliveryDto | null>(null);
  const shown = useRetained(selected);
  const detailQuery = useDelivery(selected?.id ?? null);

  const columns = useMemo<ColumnDef<NotificationDeliveryDto, unknown>[]>(
    () => [
      {
        id: "severity",
        accessorFn: (entry) => entry.severity ?? "",
        size: 130,
        header: t("alerts.colSeverity"),
        meta: {
          filter: "select",
          filterOptions: SEVERITY_ORDER.map((severity) => ({
            value: severity,
            label: t(`deliverySeverity.${severity}`),
            count: severityCounts[severity] ?? 0,
          })),
          filterLabel: t("alerts.colSeverity"),
        },
        cell: ({ row }) => (
          <StatusBadge tone={severityTone(row.original.severity)} equalWidth={false} className="min-w-[5.5rem]">
            {row.original.severity ? t(`deliverySeverity.${row.original.severity}`) : "-"}
          </StatusBadge>
        ),
      },
      {
        id: "timestamp",
        accessorFn: (entry) => {
          const stamp = entry.sent_at ?? entry.created_at;
          return stamp ? Date.parse(stamp) : 0;
        },
        size: 168,
        header: t("log.colTimestamp"),
        cell: ({ row }) => {
          const stamp = row.original.sent_at ?? row.original.created_at;
          if (!stamp) return <span className="text-xs text-muted-foreground">-</span>;
          const { date, time } = fmtDateTimeParts(Date.parse(stamp), locale);
          return (
            <span className="text-xs whitespace-nowrap tabular">
              {date} {time}
            </span>
          );
        },
      },
      {
        id: "title",
        accessorFn: (entry) => `${entry.title ?? ""} ${entry.body ?? ""}`,
        size: 300,
        header: t("alerts.colTitle"),
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{row.original.title || "-"}</span>
            {row.original.body && (
              <span className="truncate text-xs text-muted-foreground">{row.original.body}</span>
            )}
          </div>
        ),
      },
      {
        id: "recipient",
        accessorFn: (entry) => entry.admin_account_id ?? "",
        size: 200,
        header: t("log.colRecipient"),
        enableSorting: false,
        meta: {
          filter: "select",
          filterLabel: t("log.colRecipient"),
          renderFilter: ({ value, setValue, searchLabel }) => (
            <AdminUserFilter value={value} onChange={setValue} searchLabel={searchLabel} emptyLabel={tc("noResults")} />
          ),
        },
        cell: ({ row }) => <ProfileCell name={recipientName(row.original)} />,
      },
      {
        id: "channel",
        accessorFn: (entry) => String(entry.channel_id ?? ""),
        size: 140,
        header: t("log.colChannel"),
        enableSorting: false,
        meta: {
          filter: "select",
          filterLabel: t("log.colChannel"),
          renderFilter: ({ value, setValue, searchLabel }) => (
            <ChannelFilter value={value} onChange={setValue} searchLabel={searchLabel} emptyLabel={tc("noResults")} />
          ),
        },
        cell: ({ row }) => <Chip>{row.original.channel?.name ?? `#${row.original.channel_id ?? "-"}`}</Chip>,
      },
      {
        id: "status",
        accessorFn: (entry) => entry.status,
        size: 130,
        header: t("log.colStatus"),
        meta: {
          filter: "select",
          filterOptions: DELIVERY_STATUS_CODES.map((status) => ({ value: status, label: t(`deliveryStatus.${status}`) })),
          filterLabel: t("log.colStatus"),
        },
        cell: ({ row }) => (
          <StatusBadge tone={deliveryStatusTone(row.original.status)} equalWidth={false} className="min-w-[5.5rem]">
            {t(`deliveryStatus.${row.original.status}`)}
          </StatusBadge>
        ),
      },
    ],
    [t, tc, locale, severityCounts],
  );

  return (
    <div className="mx-auto max-w-7xl">
      <Card>
        <CardHeader>
          <CardTitle>{t("alerts.title")}</CardTitle>
          <CardDescription>{t("alerts.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {alertsQuery.isError ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-sm text-muted-foreground">{t("alerts.loadError")}</p>
              <Button variant="outline" size="sm" onClick={() => alertsQuery.refetch()}>
                {tc("retry")}
              </Button>
            </div>
          ) : alertsQuery.isPending ? (
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
              manualServer
              rowCount={total}
              onServerStateChange={onServerStateChange}
              searchPlaceholder={t("alerts.search")}
              emptyLabel={t("alerts.empty")}
              itemsLabel={t("alerts.items")}
              onRowClick={(entry) => setSelected(entry)}
              rowAriaLabel={(entry) => `${entry.title ?? recipientName(entry)}`}
              filterLabels={{
                filter: t("log.filter"),
                clear: t("log.clear"),
                clearFilters: tc("clearFilters"),
                search: t("log.filterSearch"),
              }}
              enableFreeze
              maxFreeze={2}
            />
          )}
        </CardContent>
      </Card>

      <Sheet open={selected != null} onOpenChange={(open) => !open && setSelected(null)}>
        {shown && (
          <SheetContent>
            <SheetHeader>
              <SheetTitle>{shown.title || recipientName(shown)}</SheetTitle>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <StatusBadge tone={severityTone(shown.severity)} equalWidth={false}>
                  {shown.severity ? t(`deliverySeverity.${shown.severity}`) : "-"}
                </StatusBadge>
                <StatusBadge tone={deliveryStatusTone(shown.status)} equalWidth={false}>
                  {t(`deliveryStatus.${shown.status}`)}
                </StatusBadge>
                <Chip>{shown.channel?.name ?? `#${shown.channel_id ?? "-"}`}</Chip>
              </div>
            </SheetHeader>
            <SheetBody className="flex flex-col gap-4">
              {detailQuery.isError ? (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <p className="text-sm text-muted-foreground">{t("alerts.detailLoadError")}</p>
                  <Button variant="outline" size="sm" onClick={() => detailQuery.refetch()}>
                    {tc("retry")}
                  </Button>
                </div>
              ) : detailQuery.isPending ? (
                <div className="flex flex-col gap-4">
                  <Skeleton className="h-40 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : (
                (() => {
                  const record = detailQuery.data;
                  const stamp = record.sent_at ?? record.created_at;
                  return (
                    <>
                      <DetailList
                        items={[
                          {
                            label: t("log.colRecipient"),
                            value: (
                              <ProfileCell
                                name={recipientName(record)}
                                subtitle={record.admin_account?.email ?? undefined}
                              />
                            ),
                          },
                          { label: t("log.colChannel"), value: record.channel?.name ?? `#${record.channel_id ?? "-"}` },
                          { label: t("log.colTemplate"), value: record.template?.name ?? record.template?.code ?? "-" },
                          {
                            label: t("log.colCampaign"),
                            value: record.campaign?.name ?? (record.campaign_id ? shortId(record.campaign_id) : "-"),
                          },
                          {
                            label: t("log.colTimestamp"),
                            value: stamp
                              ? (() => {
                                  const { date, time } = fmtDateTimeParts(Date.parse(stamp), locale);
                                  return `${date} ${time}`;
                                })()
                              : "-",
                          },
                          ...(record.error_message ? [{ label: t("log.colError"), value: record.error_message }] : []),
                        ]}
                      />
                      {(record.title || record.body) && (
                        <div className="flex flex-col gap-2">
                          <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                            {t("log.messageBody")}
                          </h4>
                          <div className="flex flex-col gap-1 rounded-lg border bg-muted/30 p-3 text-sm">
                            {record.title && <span className="font-medium">{record.title}</span>}
                            {record.body && <span className="text-muted-foreground">{record.body}</span>}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()
              )}
            </SheetBody>
          </SheetContent>
        )}
      </Sheet>
    </div>
  );
}
