"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronDown, ChevronUp, X } from "lucide-react";

import { fmtDateTimeParts } from "@/lib/format";
import { downloadCsvText } from "@/lib/export/csv";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DataTable, type ServerTableState } from "@/components/common/data-table";
import { auditTone } from "@/lib/audit/tone";
import { stepIndex } from "@/lib/paging";
import { useRecordDetail } from "@/lib/use-record-detail";
import { ProfileCell } from "@/components/common/profile-cell";
import { StatusBadge } from "@/components/common/status-badge";
import { DetailList } from "@/components/common/detail-list";
import { DiffViewer } from "@/components/common/diff-viewer";
import { AdminUserFilter } from "@/components/admin/admin-user-filter";
import { AdminActionFilter } from "@/components/admin/admin-action-filter";
import { useChangeLog } from "@/lib/admin-actions/queries";
import { getChangeLog, exportChangeLogCsv } from "@/lib/admin-actions/audit-api";
import { CsvExportButton } from "@/components/admin/csv-export-button";
import { changeServerStateToParams } from "@/lib/admin-actions/list-params";
import type { ChangeLogEntry } from "@/lib/admin-actions/types";

const OPS: string[] = ["INSERT", "UPDATE", "DELETE"];

function shortId(value: string): string {
  return value.length > 10 ? `${value.slice(0, 8)}…` : value;
}

export function ChangeLog() {
  const t = useTranslations("changeLog");
  const tc = useTranslations("common");
  const locale = useLocale();

  const opLabel = useCallback(
    (value: string) => (t.has(`op_${value}`) ? t(`op_${value}`) : value),
    [t],
  );
  const router = useRouter();
  const searchParams = useSearchParams();
  const actionId = searchParams.get("action");

  const [server, setServer] = useState<ServerTableState | null>(null);
  const params = useMemo(() => changeServerStateToParams(server, actionId), [server, actionId]);
  const changeQuery = useChangeLog(params);
  const rows = useMemo(() => changeQuery.data?.data ?? [], [changeQuery.data]);
  const total = changeQuery.data?.meta?.total ?? rows.length;
  const onServerStateChange = useCallback((state: ServerTableState) => setServer(state), []);

  const onExport = useCallback(async () => {
    const csv = await exportChangeLogCsv(params);
    downloadCsvText("change-logs.csv", csv);
  }, [params]);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const active = selectedIndex == null ? null : (rows[selectedIndex] ?? null);
  const [retained, setRetained] = useState<ChangeLogEntry | null>(null);
  const selected = active ?? retained;
  const detailRef = useRef<HTMLDivElement>(null);
  const {
    data: detail,
    loading: detailLoading,
    error: detailError,
    reload,
  } = useRecordDetail(selected?.id ?? null, getChangeLog);
  useEffect(() => {
    detailRef.current?.scrollTo({ top: 0 });
  }, [selected?.id]);
  const openAt = (index: number) => {
    setSelectedIndex(index);
    setRetained(rows[index] ?? null);
  };
  const page = (delta: number) => {
    if (selectedIndex == null) return;
    openAt(stepIndex(selectedIndex, delta, rows.length));
  };

  const columns = useMemo<ColumnDef<ChangeLogEntry, unknown>[]>(
    () => [
      {
        id: "timestamp",
        accessorFn: (entry) => entry.createdAt,
        size: 168,
        header: t("colTimestamp"),
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
        id: "schema",
        accessorFn: (entry) => entry.schema ?? "",
        size: 150,
        header: t("colSchema"),
        cell: ({ row }) => <span className="text-xs">{row.original.schema || "-"}</span>,
      },
      {
        id: "table",
        accessorFn: (entry) => entry.table,
        size: 170,
        header: t("colTable"),
        cell: ({ row }) => <span className="block truncate text-xs">{row.original.table}</span>,
      },
      {
        id: "record",
        accessorFn: (entry) => entry.recordId,
        size: 150,
        header: t("colRecord"),
        enableSorting: false,
        cell: ({ row }) => <span className="block truncate text-xs">{row.original.recordId}</span>,
      },
      {
        id: "operation",
        accessorFn: (entry) => entry.operation,
        size: 130,
        header: t("colOperation"),
        enableSorting: false,
        meta: {
          filter: "select",
          filterOptions: OPS.map((operation) => ({ value: operation, label: opLabel(operation) })),
          filterLabel: t("colOperation"),
        },
        cell: ({ row }) => (
          <StatusBadge tone={auditTone(row.original.operation)} equalWidth={false} className="min-w-[5rem]">
            {opLabel(row.original.operation)}
          </StatusBadge>
        ),
      },
      {
        id: "who",
        accessorFn: (entry) => entry.actorName,
        size: 170,
        header: t("colActor"),
        enableSorting: false,
        meta: {
          filter: "select",
          filterLabel: t("colActor"),
          renderFilter: ({ value, setValue, searchLabel }) => (
            <AdminUserFilter value={value} onChange={setValue} searchLabel={searchLabel} emptyLabel={tc("noResults")} />
          ),
        },
        cell: ({ row }) => <ProfileCell name={row.original.actorName} />,
      },
      {
        id: "action",
        accessorFn: (entry) => entry.actionCode ?? "",
        size: 200,
        header: t("colAction"),
        enableSorting: false,
        meta: {
          filter: "select",
          filterLabel: t("colAction"),
          renderFilter: ({ value, setValue, searchLabel }) => (
            <AdminActionFilter value={value} onChange={setValue} searchLabel={searchLabel} emptyLabel={tc("noResults")} />
          ),
        },
        cell: ({ row }) =>
          row.original.actionCode ? (
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-xs font-medium">{row.original.actionCode}</span>
              {row.original.actionTarget && (
                <span className="truncate text-xs text-muted-foreground">{row.original.actionTarget}</span>
              )}
            </div>
          ) : row.original.actionId ? (
            <span className="block truncate text-xs text-muted-foreground tabular">
              {shortId(row.original.actionId)}
            </span>
          ) : (
            <span className="text-muted-foreground">{t("noAction")}</span>
          ),
      },
    ],
    [t, tc, locale, opLabel],
  );

  return (
    <div className="mx-auto max-w-7xl">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {actionId && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 px-4 py-2.5 text-sm">
              <span>{t("filteredByAction")}</span>
              <Button
                variant="ghost"
                size="sm"
                className="ms-auto"
                onClick={() => router.push("/admin/audit/changes")}
              >
                <X className="size-4" />
                {t("clearActionFilter")}
              </Button>
            </div>
          )}
          {changeQuery.isError ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-sm text-muted-foreground">{t("loadError")}</p>
              <Button variant="outline" size="sm" onClick={() => changeQuery.refetch()}>
                {tc("retry")}
              </Button>
            </div>
          ) : changeQuery.isPending ? (
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
              onRowClick={(entry) => openAt(rows.indexOf(entry))}
              rowAriaLabel={(entry) => `${entry.table} ${entry.recordId}`}
              rowClassName={(entry) => (active && entry.id === active.id ? "bg-accent" : undefined)}
              toolbar={<CsvExportButton onExport={onExport} />}
              getSearchText={(entry) =>
                `${entry.schema ?? ""} ${entry.table} ${entry.recordId} ${entry.actorName}`
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

      <Sheet open={selectedIndex != null} onOpenChange={(open) => !open && setSelectedIndex(null)}>
        {selected && (
          <SheetContent onSwipeNext={() => page(1)} onSwipePrev={() => page(-1)}>
            <SheetHeader>
              <div className="flex items-center gap-1 pe-8">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => page(-1)}
                  disabled={selectedIndex === 0}
                  aria-label={tc("prevRecord")}
                >
                  <ChevronUp className="size-4" />
                </Button>
                <span className="text-xs text-muted-foreground tabular">
                  {tc("recordPosition", { index: (selectedIndex ?? 0) + 1, total: rows.length })}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => page(1)}
                  disabled={selectedIndex === rows.length - 1}
                  aria-label={tc("nextRecord")}
                >
                  <ChevronDown className="size-4" />
                </Button>
              </div>
              <SheetTitle className="font-mono text-base">
                {[selected.schema, selected.recordId].filter(Boolean).join(" · ")}
              </SheetTitle>
            </SheetHeader>
            <SheetBody ref={detailRef} className="flex flex-col gap-4">
              {detailLoading ? (
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="h-28 w-full" />
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
                        label: t("colOperation"),
                        value: (
                          <StatusBadge tone={auditTone(detail.operation)} equalWidth={false}>
                            {opLabel(detail.operation)}
                          </StatusBadge>
                        ),
                      },
                      { label: t("colActor"), value: <ProfileCell name={detail.actorName} /> },
                      {
                        label: t("linkedAction"),
                        value: detail.actionCode
                          ? detail.actionTarget
                            ? `${detail.actionCode} · ${detail.actionTarget}`
                            : detail.actionCode
                          : detail.actionId
                            ? detail.actionId
                            : t("noAction"),
                      },
                      {
                        label: t("colTimestamp"),
                        value: (() => {
                          const { date, time } = fmtDateTimeParts(detail.createdAt, locale);
                          return `${date} ${time}`;
                        })(),
                      },
                      { label: t("colTable"), value: detail.table },
                    ]}
                  />
                  <div className="flex flex-col gap-2">
                    <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      {t("detailDiff")}
                    </h4>
                    <DiffViewer changes={detail.changes} />
                  </div>
                </>
              )}
            </SheetBody>
            {selected.actionId && (
              <SheetFooter>
                <Button
                  size="lg"
                  onClick={() => router.push(`/admin/audit/actions?open=${selected.actionId}`)}
                >
                  {t("viewAction")}
                </Button>
              </SheetFooter>
            )}
          </SheetContent>
        )}
      </Sheet>
    </div>
  );
}
