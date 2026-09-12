"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronDown, ChevronUp } from "lucide-react";

import { fmtDateTimeParts } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DataTable, type ServerTableState } from "@/components/common/data-table";
import { auditTone } from "@/lib/audit/tone";
import { stepIndex } from "@/lib/paging";
import { useRecordDetail } from "@/lib/use-record-detail";
import { useRetained } from "@/lib/use-retained";
import { StatusBadge } from "@/components/common/status-badge";
import { ProfileCell } from "@/components/common/profile-cell";
import { DetailList } from "@/components/common/detail-list";
import { useAdminActions } from "@/lib/admin-actions/queries";
import { getAdminAction } from "@/lib/admin-actions/audit-api";
import { actionServerStateToParams } from "@/lib/admin-actions/list-params";
import type { AdminAction } from "@/lib/admin-actions/types";

const RESULTS: string[] = ["SUCCESS", "PARTIAL", "FAILURE"];
const SEVERITIES: string[] = ["INFO", "WARNING", "CRITICAL"];

export function ActionLog() {
  const t = useTranslations("actionLog");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  const resultLabel = useCallback(
    (value: string) => (t.has(`result_${value}`) ? t(`result_${value}`) : value),
    [t],
  );
  const severityLabel = useCallback(
    (value: string) => (t.has(`severity_${value}`) ? t(`severity_${value}`) : value),
    [t],
  );

  const searchParams = useSearchParams();
  const openId = searchParams.get("open");

  const [server, setServer] = useState<ServerTableState | null>(null);
  const params = useMemo(() => actionServerStateToParams(server), [server]);
  const actionsQuery = useAdminActions(params);
  const rows = useMemo(() => actionsQuery.data?.data ?? [], [actionsQuery.data]);
  const total = actionsQuery.data?.meta?.total ?? rows.length;
  const onServerStateChange = useCallback((state: ServerTableState) => setServer(state), []);

  const [selectedId, setSelectedId] = useState<string | null>(openId);
  const index = selectedId ? rows.findIndex((action) => action.id === selectedId) : -1;
  const detailRef = useRef<HTMLDivElement>(null);
  const {
    data: detail,
    loading: detailLoading,
    error: detailError,
    reload,
  } = useRecordDetail(selectedId, getAdminAction);
  const liveHead = (index >= 0 ? rows[index] : null) ?? detail ?? null;
  const selected = useRetained(liveHead);
  useEffect(() => {
    detailRef.current?.scrollTo({ top: 0 });
  }, [selectedId]);
  const close = () => {
    setSelectedId(null);
    if (openId) router.replace("/admin/audit/actions");
  };
  const page = (delta: number) => {
    if (index < 0) return;
    setSelectedId(rows[stepIndex(index, delta, rows.length)].id);
  };

  const columns = useMemo<ColumnDef<AdminAction, unknown>[]>(
    () => [
      {
        id: "timestamp",
        accessorFn: (action) => action.createdAt,
        size: 168,
        header: t("colTimestamp"),
        meta: { filter: "dateRange", filterLabel: t("colTimestamp") },
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
        id: "actor",
        accessorFn: (action) => action.actorName,
        size: 180,
        header: t("colActor"),
        enableSorting: false,
        cell: ({ row }) => <ProfileCell name={row.original.actorName} />,
      },
      {
        id: "actionCode",
        accessorFn: (action) => action.actionName,
        size: 210,
        header: t("colActionCode"),
        meta: { filter: "text", filterLabel: t("colActionCode") },
        cell: ({ row }) => <span className="text-sm font-medium">{row.original.actionName}</span>,
      },
      {
        id: "target",
        accessorFn: (action) => `${action.targetType ?? ""} ${action.summary}`,
        size: 280,
        header: t("colTarget"),
        meta: { filter: "text", filterLabel: t("colTarget") },
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col">
            <span className="font-medium">{row.original.targetType || "-"}</span>
            <span className="truncate text-xs text-muted-foreground">{row.original.summary}</span>
          </div>
        ),
      },
      {
        id: "service",
        accessorFn: (action) => action.service,
        size: 180,
        header: t("colService"),
        enableSorting: false,
        cell: ({ row }) => <span className="text-sm">{row.original.service}</span>,
      },
      {
        id: "result",
        accessorFn: (action) => action.result,
        size: 130,
        header: t("colResult"),
        enableSorting: false,
        meta: {
          filter: "select",
          filterOptions: RESULTS.map((result) => ({ value: result, label: resultLabel(result) })),
          filterLabel: t("colResult"),
        },
        cell: ({ row }) => (
          <StatusBadge tone={auditTone(row.original.result)} equalWidth={false} className="min-w-[5.5rem]">
            {resultLabel(row.original.result)}
          </StatusBadge>
        ),
      },
      {
        id: "severity",
        accessorFn: (action) => action.severity,
        size: 130,
        header: t("colSeverity"),
        enableSorting: false,
        meta: {
          filter: "select",
          filterOptions: SEVERITIES.map((severity) => ({ value: severity, label: severityLabel(severity) })),
          filterLabel: t("colSeverity"),
        },
        cell: ({ row }) => (
          <StatusBadge tone={auditTone(row.original.severity)} equalWidth={false} className="min-w-[5.5rem]">
            {severityLabel(row.original.severity)}
          </StatusBadge>
        ),
      },
    ],
    [t, locale, resultLabel, severityLabel],
  );

  return (
    <div className="mx-auto max-w-7xl">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {actionsQuery.isError ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-sm text-muted-foreground">{t("loadError")}</p>
              <Button variant="outline" size="sm" onClick={() => actionsQuery.refetch()}>
                {tc("retry")}
              </Button>
            </div>
          ) : actionsQuery.isPending ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-11 w-full" />
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
              searchPlaceholder={t("search")}
              emptyLabel={t("empty")}
              itemsLabel={t("items")}
              onRowClick={(action) => setSelectedId(action.id)}
              rowAriaLabel={(action) => action.actionName}
              rowClassName={(action) => (action.id === selectedId ? "bg-accent" : undefined)}
              getSearchText={(action) =>
                `${action.actionName} ${action.summary} ${action.actorName} ${action.service}`
              }
              filterLabels={{
                filter: t("filter"),
                clear: t("clear"),
                clearFilters: tc("clearFilters"),
                search: t("filterSearch"),
                from: t("dateFrom"),
                to: t("dateTo"),
              }}
              enableFreeze
              maxFreeze={2}
            />
          )}
        </CardContent>
      </Card>

      <Sheet open={selectedId != null} onOpenChange={(open) => !open && close()}>
        {selected && (
          <SheetContent onSwipeNext={() => page(1)} onSwipePrev={() => page(-1)}>
            <SheetHeader>
              {index >= 0 && (
                <div className="flex items-center gap-1 pe-8">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => page(-1)}
                    disabled={index === 0}
                    aria-label={tc("prevRecord")}
                  >
                    <ChevronUp className="size-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground tabular">
                    {tc("recordPosition", { index: index + 1, total: rows.length })}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => page(1)}
                    disabled={index === rows.length - 1}
                    aria-label={tc("nextRecord")}
                  >
                    <ChevronDown className="size-4" />
                  </Button>
                </div>
              )}
              <SheetTitle>{selected.actionName}</SheetTitle>
              <SheetDescription className="sr-only">{selected.actionName}</SheetDescription>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <StatusBadge tone={auditTone(selected.result)} equalWidth={false}>
                  {resultLabel(selected.result)}
                </StatusBadge>
                <StatusBadge tone={auditTone(selected.severity)} equalWidth={false}>
                  {severityLabel(selected.severity)}
                </StatusBadge>
                {selected.ticketId && (
                  <span className="rounded-md border px-2 py-0.5 text-xs">{selected.ticketId}</span>
                )}
              </div>
            </SheetHeader>
            <SheetBody ref={detailRef} className="flex flex-col gap-4">
              {detailLoading ? (
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : detailError || !detail ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <p className="text-sm text-muted-foreground">{t("loadError")}</p>
                  <Button variant="outline" size="sm" onClick={reload}>
                    {tc("retry")}
                  </Button>
                </div>
              ) : (
                <>
                  <DetailList
                    items={[
                      {
                        label: t("colActor"),
                        value: <ProfileCell name={detail.actorName} subtitle={detail.adminEmail || undefined} />,
                      },
                      { label: t("detailTargetType"), value: detail.targetType || "-" },
                      { label: t("detailTargetId"), value: detail.targetId || "-" },
                      { label: t("detailSummary"), value: detail.summary || "-" },
                      { label: t("colService"), value: detail.service || "-" },
                      {
                        label: t("colTimestamp"),
                        value: (() => {
                          const { date, time } = fmtDateTimeParts(detail.createdAt, locale);
                          return `${date} ${time}`;
                        })(),
                      },
                      { label: t("detailCorrelation"), value: detail.correlationId || "-" },
                      { label: t("detailDevice"), value: detail.device || "-" },
                    ]}
                  />
                  <div className="flex flex-col gap-2">
                    <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      {t("detailInputs")}
                    </h4>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      {detail.inputs.length === 0 ? (
                        <p className="py-2 text-center text-sm text-muted-foreground">{t("noInputs")}</p>
                      ) : (
                        <DetailList
                          items={detail.inputs.map((input) => ({ label: input.label, value: input.value }))}
                        />
                      )}
                    </div>
                  </div>
                </>
              )}
            </SheetBody>
          </SheetContent>
        )}
      </Sheet>
    </div>
  );
}
