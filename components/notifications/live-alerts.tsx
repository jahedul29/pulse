"use client";

import { useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet } from "@/components/ui/sheet";
import { DataTable, type ServerTableState } from "@/components/common/data-table";
import { useRecordPager } from "@/lib/use-record-pager";
import { StatusBadge } from "@/components/common/status-badge";
import { LevelBadge } from "@/components/common/level-badge";
import { ProfileCell } from "@/components/common/profile-cell";
import { Chip } from "@/components/common/chip";
import { DeliveryDrawerContent } from "@/components/notifications/delivery-references";
import { recordHref } from "@/lib/record-links";
import { useRetained } from "@/lib/use-retained";
import { liveAlertsQuery, useLiveAlerts, useDelivery } from "@/lib/notifications/queries";
import { liveAlertsStateToParams } from "@/lib/notifications/list-params";
import {
  DELIVERY_STATUS_CODES,
  SEVERITY_ORDER,
  deliveryStatusTone,
  recipientName,
  severityTone,
} from "@/lib/notifications/dto";
import type { NotificationDeliveryDto } from "@/lib/notifications/dto";
import { ChannelFilter } from "@/components/notifications/channel-select";
import { AdminUserFilter } from "@/components/admin/admin-user-filter";
import { LoadError } from "@/components/common/load-error";
import { PERMISSIONS, useHasPermission } from "@/lib/auth/permissions";
import { PageContainer } from "@/components/common/page-container";
import { columnWidth } from "@/lib/table/column-widths";
import { htmlToPlainText } from "@/lib/notifications/variables";
import { RecordDrawerFallback } from "@/components/common/record-drawer-fallback";
import { useServerPage } from "@/lib/use-server-page";
import { TableDate } from "@/components/common/table-date";

export function LiveAlerts() {
  const t = useTranslations("notifications");
  const tc = useTranslations("common");
  const locale = useLocale();

  const [server, setServer] = useState<ServerTableState | null>(null);
  const params = useMemo(() => liveAlertsStateToParams(server), [server]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const openId = searchParams.get("open");
  const [selectedId, setSelectedId] = useState<string | null>(openId);
  const alertsQuery = useLiveAlerts(params, selectedId != null);
  const rows = useMemo(() => alertsQuery.data?.data ?? [], [alertsQuery.data]);
  const total = alertsQuery.data?.meta?.total ?? rows.length;
  const severityCounts = useMemo(() => alertsQuery.data?.severityCounts ?? {}, [alertsQuery.data]);
  const onServerStateChange = useCallback((state: ServerTableState) => setServer(state), []);

  const { controller: tableController, page: serverPage } = useServerPage({
    server,
    pageSize: 10,
    total: total,
    data: alertsQuery.data,
    failed: alertsQuery.isError,
    queryFor: (state) => liveAlertsQuery(liveAlertsStateToParams(state)),
  });
  const selectDelivery = useCallback((entry: NotificationDeliveryDto) => setSelectedId(String(entry.id)), []);
  const pager = useRecordPager({
    rows,
    getId: (entry) => String(entry.id),
    activeId: selectedId,
    onSelect: selectDelivery,
    page: serverPage,
  });
  const detailQuery = useDelivery(selectedId);
  const head = (selectedId == null ? null : rows.find((entry) => String(entry.id) === selectedId)) ?? detailQuery.data ?? null;
  const shown = useRetained(head);
  const close = () => {
    setSelectedId(null);
    if (openId) router.replace("/admin/notifications/alerts");
  };
  const canViewDelivery = useHasPermission(PERMISSIONS.NOTIFICATION_DELIVERIES_VIEW);

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
        cell: ({ row }) =>
          row.original.severity ? (
            <LevelBadge tone={severityTone(row.original.severity)} className="min-w-[5.5rem]">
              {t(`deliverySeverity.${row.original.severity}`)}
            </LevelBadge>
          ) : (
            <span className="text-muted-foreground">-</span>
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
          return <TableDate epoch={stamp ? Date.parse(stamp) : null} locale={locale} />;
        },
      },
      {
        id: "title",
        accessorFn: (entry) => `${entry.title ?? ""} ${htmlToPlainText(entry.body ?? "")}`,
        ...columnWidth("text", { min: 240 }),
        header: t("alerts.colTitle"),
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{row.original.title || "-"}</span>
            {row.original.body && (
              <span className="truncate text-xs text-muted-foreground">{htmlToPlainText(row.original.body)}</span>
            )}
          </div>
        ),
      },
      {
        id: "recipient",
        accessorFn: (entry) => entry.admin_account_id ?? "",
        ...columnWidth("name"),
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
        cell: ({ row }) => <Chip>{row.original.channel?.name ?? "-"}</Chip>,
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
    <PageContainer fill>
      <Card>
        <CardHeader>
          <CardTitle>{t("alerts.title")}</CardTitle>
          <CardDescription>{t("alerts.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {alertsQuery.isError ? (
            <LoadError error={alertsQuery.error} message={t("alerts.loadError")} onRetry={() => alertsQuery.refetch()} />
          ) : alertsQuery.isPending ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : (
            <DataTable
              fill
              columns={columns}
              data={rows}
              pageSize={10}
              manualServer
              rowCount={total}
              onServerStateChange={onServerStateChange}
              searchPlaceholder={t("alerts.search")}
              emptyLabel={t("alerts.empty")}
              itemsLabel={t("alerts.items")}
              onRowClick={selectDelivery}
              getRowId={(entry) => String(entry.id)}
              activeRowId={selectedId}
              controllerRef={tableController}
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

      <Sheet inspect open={selectedId != null} onOpenChange={(open) => !open && close()}>
        {selectedId != null && head == null ? (
          <RecordDrawerFallback
            loading={detailQuery.isPending}
            error={detailQuery.error}
            forbidden={!canViewDelivery}
            onRetry={() => detailQuery.refetch()}
          />
        ) : shown && (
          <DeliveryDrawerContent
            record={detailQuery.data ?? shown}
            link={recordHref("liveAlert", shown.id)}
            pager={pager}
            loading={canViewDelivery && detailQuery.isPending}
            error={detailQuery.isError ? detailQuery.error : null}
            loadErrorLabel={t("alerts.detailLoadError")}
            onRetry={() => detailQuery.refetch()}
          />
        )}
      </Sheet>
    </PageContainer>
  );
}
