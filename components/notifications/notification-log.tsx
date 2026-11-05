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
import { deliveriesListQuery, useDeliveries, useDelivery } from "@/lib/notifications/queries";
import { ChannelFilter } from "@/components/notifications/channel-select";
import { CampaignFilter } from "@/components/notifications/campaign-filter";
import { AdminUserFilter } from "@/components/admin/admin-user-filter";
import { deliveriesStateToParams } from "@/lib/notifications/list-params";
import {
  DELIVERY_STATUS_CODES,
  SEVERITY_ORDER,
  deliveryStatusTone,
  recipientName,
  severityTone,
  shortId,
} from "@/lib/notifications/dto";
import type { NotificationDeliveryDto } from "@/lib/notifications/dto";
import { LoadError } from "@/components/common/load-error";
import { PageContainer } from "@/components/common/page-container";
import { columnWidth } from "@/lib/table/column-widths";
import { RecordDrawerFallback } from "@/components/common/record-drawer-fallback";
import { useServerPage } from "@/lib/use-server-page";
import { TableDate } from "@/components/common/table-date";

export function NotificationLog() {
  const t = useTranslations("notifications");
  const tc = useTranslations("common");
  const locale = useLocale();

  const [server, setServer] = useState<ServerTableState | null>(null);
  const params = useMemo(() => deliveriesStateToParams(server), [server]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const openId = searchParams.get("open");
  const [selectedId, setSelectedId] = useState<string | null>(openId);
  const deliveriesQuery = useDeliveries(params, selectedId != null);
  const rows = useMemo(() => deliveriesQuery.data?.data ?? [], [deliveriesQuery.data]);
  const total = deliveriesQuery.data?.meta?.total ?? rows.length;
  const onServerStateChange = useCallback((state: ServerTableState) => setServer(state), []);

  const { controller: tableController, page: serverPage } = useServerPage({
    server,
    pageSize: 10,
    total: total,
    data: deliveriesQuery.data,
    failed: deliveriesQuery.isError,
    queryFor: (state) => deliveriesListQuery(deliveriesStateToParams(state)),
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
    if (openId) router.replace("/admin/notifications/log");
  };

  const columns = useMemo<ColumnDef<NotificationDeliveryDto, unknown>[]>(
    () => [
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
        id: "template",
        accessorFn: (entry) => entry.template?.code ?? "",
        ...columnWidth("name"),
        header: t("log.colTemplate"),
        enableSorting: false,
        cell: ({ row }) => <span className="block truncate text-xs">{row.original.template?.code ?? "-"}</span>,
      },
      {
        id: "campaign",
        accessorFn: (entry) => entry.campaign?.name ?? entry.campaign_id ?? "",
        ...columnWidth("name"),
        header: t("log.colCampaign"),
        enableSorting: false,
        meta: {
          filter: "select",
          filterLabel: t("log.colCampaign"),
          renderFilter: ({ value, setValue, searchLabel }) => (
            <CampaignFilter value={value} onChange={setValue} searchLabel={searchLabel} emptyLabel={tc("noResults")} />
          ),
        },
        cell: ({ row }) => {
          const label = row.original.campaign?.name ?? (row.original.campaign_id ? shortId(row.original.campaign_id) : null);
          return label ? (
            <span className="block truncate text-xs">{label}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          );
        },
      },
      {
        id: "severity",
        accessorFn: (entry) => entry.severity ?? "",
        size: 120,
        header: t("log.colSeverity"),
        meta: {
          filter: "select",
          filterOptions: SEVERITY_ORDER.map((severity) => ({
            value: severity,
            label: t(`deliverySeverity.${severity}`),
          })),
          filterLabel: t("log.colSeverity"),
        },
        cell: ({ row }) =>
          row.original.severity ? (
            <LevelBadge tone={severityTone(row.original.severity)} className="min-w-[5rem]">
              {t(`deliverySeverity.${row.original.severity}`)}
            </LevelBadge>
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
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
    [t, tc, locale],
  );

  return (
    <PageContainer fill>
      <Card>
        <CardHeader>
          <CardTitle>{t("log.title")}</CardTitle>
          <CardDescription>{t("log.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {deliveriesQuery.isError ? (
            <LoadError error={deliveriesQuery.error} message={t("log.loadError")} onRetry={() => deliveriesQuery.refetch()} />
          ) : deliveriesQuery.isPending ? (
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
              searchPlaceholder={t("log.search")}
              emptyLabel={t("log.empty")}
              itemsLabel={t("log.items")}
              onRowClick={selectDelivery}
              getRowId={(entry) => String(entry.id)}
              activeRowId={selectedId}
              controllerRef={tableController}
              rowAriaLabel={(entry) => `${recipientName(entry)} ${entry.template?.code ?? ""}`}
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
            onRetry={() => detailQuery.refetch()}
          />
        ) : shown && (
          <DeliveryDrawerContent
            record={detailQuery.data ?? shown}
            link={recordHref("delivery", shown.id)}
            pager={pager}
            loading={detailQuery.isPending}
            error={detailQuery.isError ? detailQuery.error : null}
            loadErrorLabel={t("log.detailLoadError")}
            onRetry={() => detailQuery.refetch()}
          />
        )}
      </Sheet>
    </PageContainer>
  );
}
