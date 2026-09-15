"use client";

import { useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DataTable, type ServerTableState } from "@/components/common/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { ProfileCell } from "@/components/common/profile-cell";
import { Chip } from "@/components/common/chip";
import { DetailList } from "@/components/common/detail-list";
import { fmtDateTimeParts } from "@/lib/format";
import { htmlToPlainText } from "@/lib/notifications/variables";
import { useRetained } from "@/lib/use-retained";
import { useDeliveries, useDelivery } from "@/lib/notifications/queries";
import { ChannelFilter } from "@/components/notifications/channel-select";
import { CampaignFilter } from "@/components/notifications/campaign-filter";
import { AdminUserFilter } from "@/components/admin/admin-user-filter";
import { deliveriesStateToParams } from "@/lib/notifications/list-params";
import { DELIVERY_STATUS_CODES, deliveryStatusTone, localizedText } from "@/lib/notifications/dto";
import type { NotificationDeliveryDto } from "@/lib/notifications/dto";
import { useAllAdminUsers } from "@/lib/user-management/queries";

function shortId(value: string | null): string {
  if (!value) return "-";
  return value.length > 10 ? `${value.slice(0, 8)}…` : value;
}

export function NotificationLog() {
  const t = useTranslations("notifications");
  const tc = useTranslations("common");
  const locale = useLocale();

  const [server, setServer] = useState<ServerTableState | null>(null);
  const params = useMemo(() => deliveriesStateToParams(server), [server]);
  const deliveriesQuery = useDeliveries(params);
  const rows = useMemo(() => deliveriesQuery.data?.data ?? [], [deliveriesQuery.data]);
  const total = deliveriesQuery.data?.meta?.total ?? rows.length;
  const onServerStateChange = useCallback((state: ServerTableState) => setServer(state), []);

  const usersQuery = useAllAdminUsers();
  const recipient = useMemo(() => {
    const map = new Map((usersQuery.data ?? []).map((user) => [user.id, user]));
    return (id: string | null) => (id ? map.get(id) ?? null : null);
  }, [usersQuery.data]);

  const [selected, setSelected] = useState<NotificationDeliveryDto | null>(null);
  const shown = useRetained(selected);
  const detailQuery = useDelivery(selected?.id ?? null);

  const recipientName = useCallback(
    (id: string | null) => recipient(id)?.name ?? recipient(id)?.email ?? shortId(id),
    [recipient],
  );

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
        id: "recipient",
        accessorFn: (entry) => entry.admin_account_id ?? "",
        size: 220,
        header: t("log.colRecipient"),
        enableSorting: false,
        meta: {
          filter: "select",
          filterLabel: t("log.colRecipient"),
          renderFilter: ({ value, setValue, searchLabel }) => (
            <AdminUserFilter value={value} onChange={setValue} searchLabel={searchLabel} emptyLabel={tc("noResults")} />
          ),
        },
        cell: ({ row }) => <ProfileCell name={recipientName(row.original.admin_account_id)} />,
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
        id: "template",
        accessorFn: (entry) => entry.template?.code ?? "",
        size: 180,
        header: t("log.colTemplate"),
        enableSorting: false,
        cell: ({ row }) => <span className="block truncate text-xs">{row.original.template?.code ?? "-"}</span>,
      },
      {
        id: "campaign",
        accessorFn: (entry) => entry.campaign?.name ?? entry.campaign_id ?? "",
        size: 180,
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
      {
        id: "error",
        accessorFn: (entry) => entry.error_message ?? "",
        size: 220,
        header: t("log.colError"),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="line-clamp-2 text-xs text-muted-foreground">{row.original.error_message ?? "-"}</span>
        ),
      },
    ],
    [t, tc, locale, recipientName],
  );

  return (
    <div className="mx-auto max-w-7xl">
      <Card>
        <CardHeader>
          <CardTitle>{t("log.title")}</CardTitle>
          <CardDescription>{t("log.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {deliveriesQuery.isError ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-sm text-muted-foreground">{t("log.loadError")}</p>
              <Button variant="outline" size="sm" onClick={() => deliveriesQuery.refetch()}>
                {tc("retry")}
              </Button>
            </div>
          ) : deliveriesQuery.isPending ? (
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
              searchPlaceholder={t("log.search")}
              emptyLabel={t("log.empty")}
              itemsLabel={t("log.items")}
              onRowClick={(entry) => setSelected(entry)}
              rowAriaLabel={(entry) => `${recipientName(entry.admin_account_id)} ${entry.template?.code ?? ""}`}
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
              <SheetTitle>{recipientName(shown.admin_account_id)}</SheetTitle>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <StatusBadge tone={deliveryStatusTone(shown.status)} equalWidth={false}>
                  {t(`deliveryStatus.${shown.status}`)}
                </StatusBadge>
                <Chip>{shown.channel?.name ?? `#${shown.channel_id ?? "-"}`}</Chip>
              </div>
            </SheetHeader>
            <SheetBody className="flex flex-col gap-4">
              {detailQuery.isError ? (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <p className="text-sm text-muted-foreground">{t("log.detailLoadError")}</p>
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
                          { label: t("log.colRecipient"), value: recipientName(record.admin_account_id) },
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
                      {record.template && (
                        <div className="flex flex-col gap-2">
                          <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                            {t("log.messageBody")}
                          </h4>
                          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                            {htmlToPlainText(localizedText(record.template.body, "en"))}
                          </div>
                          {record.template.body?.AR && (
                            <div dir="rtl" className="rounded-lg border bg-muted/30 p-3 text-sm">
                              {htmlToPlainText(record.template.body.AR)}
                            </div>
                          )}
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
