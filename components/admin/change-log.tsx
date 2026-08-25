"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronDown, ChevronUp, X } from "lucide-react";

import { fmtDateTimeParts } from "@/lib/format";
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
import { DataTable } from "@/components/common/data-table";
import { opTone } from "@/lib/admin-actions/tones";
import { stepIndex } from "@/lib/paging";
import { useRecordDetail } from "@/lib/use-record-detail";
import { ProfileCell } from "@/components/common/profile-cell";
import { StatusBadge } from "@/components/common/status-badge";
import { DetailList } from "@/components/common/detail-list";
import { DiffViewer } from "@/components/common/diff-viewer";
import { fetchChangeLog, fetchChangeDetail, changeTableOptions, actionName } from "@/lib/admin-actions/api";
import type { ChangeLogEntry, ChangeOp } from "@/lib/admin-actions/types";

const OPS: ChangeOp[] = ["insert", "update", "delete"];

export function ChangeLog() {
  const t = useTranslations("changeLog");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const actionId = params.get("action");

  const [rows, setRows] = useState<ChangeLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
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
  } = useRecordDetail(selected?.id ?? null, fetchChangeDetail);
  useEffect(() => {
    detailRef.current?.scrollTo({ top: 0 });
  }, [selected?.id]);
  const openAt = (i: number) => {
    setSelectedIndex(i);
    setRetained(rows[i] ?? null);
  };
  const page = (delta: number) => {
    if (selectedIndex == null) return;
    openAt(stepIndex(selectedIndex, delta, rows.length));
  };

  useEffect(() => {
    let active = true;
    fetchChangeLog({ actionId })
      .then((r) => {
        if (!active) return;
        setRows(r);
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
  }, [actionId]);

  const tableOptions = useMemo(
    () => changeTableOptions().map((tb) => ({ value: tb, label: tb })),
    [],
  );

  const columns = useMemo<ColumnDef<ChangeLogEntry, unknown>[]>(
    () => [
      {
        id: "timestamp",
        accessorFn: (r) => r.createdAt,
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
        id: "table",
        accessorFn: (r) => r.table,
        size: 170,
        header: t("colTable"),
        meta: { filter: "select", filterOptions: tableOptions, filterLabel: t("colTable") },
        cell: ({ row }) => <span className="text-xs">{row.original.table}</span>,
      },
      {
        id: "record",
        accessorFn: (r) => r.recordId,
        size: 150,
        header: t("colRecord"),
        cell: ({ row }) => <span className="text-xs">{row.original.recordId}</span>,
      },
      {
        id: "operation",
        accessorFn: (r) => r.operation,
        size: 130,
        header: t("colOperation"),
        meta: {
          filter: "select",
          filterOptions: OPS.map((o) => ({ value: o, label: t(`op_${o}`) })),
          filterLabel: t("colOperation"),
        },
        cell: ({ row }) => (
          <StatusBadge tone={opTone(row.original.operation)} equalWidth={false} className="min-w-[5rem]">
            {t(`op_${row.original.operation}`)}
          </StatusBadge>
        ),
      },
      {
        id: "columns",
        accessorFn: (r) => r.changes.length,
        size: 130,
        header: t("colColumns"),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground tabular">
            {t("columnsCount", { count: row.original.changes.length })}
          </span>
        ),
      },
      {
        id: "who",
        accessorFn: (r) => r.actorName,
        size: 170,
        header: t("colWho"),
        cell: ({ row }) => <ProfileCell name={row.original.actorName} />,
      },
      {
        id: "action",
        accessorFn: (r) => actionName(r.actionId) ?? "",
        size: 200,
        header: t("colAction"),
        cell: ({ row }) => {
          const name = actionName(row.original.actionId);
          return name ? (
            <span className="truncate text-sm">{name}</span>
          ) : (
            <span className="text-muted-foreground">{t("noAction")}</span>
          );
        },
      },
    ],
    [t, locale, tableOptions],
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
          {error ? (
            <p className="py-16 text-center text-sm text-muted-foreground">{t("loadError")}</p>
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
              searchPlaceholder={t("search")}
              emptyLabel={t("empty")}
              itemsLabel={t("items")}
              onRowClick={(r) => openAt(rows.indexOf(r))}
              rowAriaLabel={(r) => `${r.table} ${r.recordId}`}
              rowClassName={(r) => (active && r.id === active.id ? "bg-accent" : undefined)}
              getSearchText={(r) =>
                `${r.table} ${r.recordId} ${r.actorName} ${r.changes.map((c) => c.column).join(" ")}`
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

      <Sheet open={selectedIndex != null} onOpenChange={(o) => !o && setSelectedIndex(null)}>
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
                {selected.table} · {selected.recordId}
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
                          <StatusBadge tone={opTone(detail.operation)} equalWidth={false}>
                            {t(`op_${detail.operation}`)}
                          </StatusBadge>
                        ),
                      },
                      { label: t("colWho"), value: detail.actorName },
                      {
                        label: t("colTimestamp"),
                        value: (() => {
                          const { date, time } = fmtDateTimeParts(detail.createdAt, locale);
                          return `${date} ${time}`;
                        })(),
                      },
                      {
                        label: t("linkedAction"),
                        value: actionName(detail.actionId) ?? t("noAction"),
                      },
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
                <Button size="lg" onClick={() => router.push("/admin/audit/actions")}>
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
