"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronDown, ChevronUp, Download } from "lucide-react";
import { toast } from "sonner";

import { fmtDateTimeParts } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DataTable, toolbarIconButtonClass } from "@/components/common/data-table";
import { resultTone, severityTone } from "@/lib/admin-actions/tones";
import { stepIndex } from "@/lib/paging";
import { useRecordDetail } from "@/lib/use-record-detail";
import { StatusBadge } from "@/components/common/status-badge";
import { ProfileCell } from "@/components/common/profile-cell";
import { DetailList } from "@/components/common/detail-list";
import { exportCsv } from "@/lib/export/csv";
import { fetchAdminActions, fetchActionDetail, actionServiceOptions } from "@/lib/admin-actions/api";
import type { AdminAction, ActionResult, ActionSeverity } from "@/lib/admin-actions/types";

const RESULTS: ActionResult[] = ["success", "partial", "failure"];
const SEVERITIES: ActionSeverity[] = ["info", "warning", "critical"];

export function ActionLog() {
  const t = useTranslations("actionLog");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  const [rows, setRows] = useState<AdminAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const active = selectedIndex == null ? null : (rows[selectedIndex] ?? null);
  const [retained, setRetained] = useState<AdminAction | null>(null);
  const selected = active ?? retained;
  const detailRef = useRef<HTMLDivElement>(null);
  const {
    data: detail,
    loading: detailLoading,
    error: detailError,
    reload,
  } = useRecordDetail(selected?.id ?? null, fetchActionDetail);
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
    fetchAdminActions()
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
  }, []);

  const serviceOptions = useMemo(
    () => actionServiceOptions().map((s) => ({ value: s, label: s })),
    [],
  );

  const columns = useMemo<ColumnDef<AdminAction, unknown>[]>(
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
        id: "actor",
        accessorFn: (r) => r.actorName,
        size: 180,
        header: t("colActor"),
        cell: ({ row }) => <ProfileCell name={row.original.actorName} />,
      },
      {
        id: "action",
        accessorFn: (r) => `${r.actionName} ${r.summary}`,
        size: 300,
        header: t("colAction"),
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col">
            <span className="font-medium">{row.original.actionName}</span>
            <span className="truncate text-xs text-muted-foreground">{row.original.summary}</span>
          </div>
        ),
      },
      {
        id: "service",
        accessorFn: (r) => r.service,
        size: 180,
        header: t("colService"),
        meta: { filter: "select", filterOptions: serviceOptions, filterLabel: t("colService") },
        cell: ({ row }) => <span className="text-sm">{row.original.service}</span>,
      },
      {
        id: "result",
        accessorFn: (r) => r.result,
        size: 130,
        header: t("colResult"),
        meta: {
          filter: "select",
          filterOptions: RESULTS.map((r) => ({ value: r, label: t(`result_${r}`) })),
          filterLabel: t("colResult"),
        },
        cell: ({ row }) => (
          <StatusBadge tone={resultTone(row.original.result)} equalWidth={false} className="min-w-[5.5rem]">
            {t(`result_${row.original.result}`)}
          </StatusBadge>
        ),
      },
      {
        id: "severity",
        accessorFn: (r) => r.severity,
        size: 130,
        header: t("colSeverity"),
        meta: {
          filter: "select",
          filterOptions: SEVERITIES.map((s) => ({ value: s, label: t(`severity_${s}`) })),
          filterLabel: t("colSeverity"),
        },
        cell: ({ row }) => (
          <StatusBadge tone={severityTone(row.original.severity)} equalWidth={false} className="min-w-[5.5rem]">
            {t(`severity_${row.original.severity}`)}
          </StatusBadge>
        ),
      },
      {
        id: "ticket",
        accessorFn: (r) => r.ticketId ?? "",
        size: 120,
        header: t("colTicket"),
        cell: ({ row }) =>
          row.original.ticketId ? (
            <span className="rounded-md border px-2 py-0.5 text-xs">
              {row.original.ticketId}
            </span>
          ) : (
            <span className="text-muted-foreground">{t("noTicket")}</span>
          ),
      },
    ],
    [t, locale, serviceOptions],
  );

  const onExport = (exportRows: AdminAction[]) => {
    const headers = [
      t("colTimestamp"),
      t("colActor"),
      t("colAction"),
      t("colService"),
      t("colResult"),
      t("colSeverity"),
      t("colTicket"),
    ];
    const csvRows = exportRows.map((r) => {
      const { date, time } = fmtDateTimeParts(r.createdAt, locale);
      return [
        `${date} ${time}`,
        r.actorName,
        `${r.actionName} — ${r.summary}`,
        r.service,
        t(`result_${r.result}`),
        t(`severity_${r.severity}`),
        r.ticketId ?? "",
      ];
    });
    exportCsv("admin-action-log.csv", headers, csvRows);
  };

  return (
    <div className="mx-auto max-w-7xl">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
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
              rowAriaLabel={(r) => r.actionName}
              rowClassName={(r) => (active && r.id === active.id ? "bg-accent" : undefined)}
              getSearchText={(r) =>
                `${r.actionName} ${r.summary} ${r.actorName} ${r.service} ${r.ticketId ?? ""}`
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
              toolbar={(visibleRows) => (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => onExport(visibleRows)}
                        aria-label={t("export")}
                        className={toolbarIconButtonClass}
                      />
                    }
                  >
                    <Download className="size-4" />
                    <span className="hidden sm:inline">{t("export")}</span>
                  </TooltipTrigger>
                  <TooltipContent>{t("export")}</TooltipContent>
                </Tooltip>
              )}
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
              <SheetTitle>{selected.actionName}</SheetTitle>
              <SheetDescription>{selected.summary}</SheetDescription>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <StatusBadge tone={resultTone(selected.result)} equalWidth={false}>
                  {t(`result_${selected.result}`)}
                </StatusBadge>
                <StatusBadge tone={severityTone(selected.severity)} equalWidth={false}>
                  {t(`severity_${selected.severity}`)}
                </StatusBadge>
                {selected.ticketId && (
                  <span className="rounded-md border px-2 py-0.5 text-xs">
                    {selected.ticketId}
                  </span>
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
                  <DetailList items={[{ label: t("detailService"), value: detail.entity }]} />
                  <div className="flex flex-col gap-2">
                    <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      {t("detailInputs")}
                    </h4>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <DetailList
                        items={detail.inputs.map((i) => ({ label: i.label, value: i.value }))}
                      />
                    </div>
                  </div>
                </>
              )}
            </SheetBody>
            <SheetFooter>
              {selected.ticketId && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => toast(t("ticketToast", { ticket: selected.ticketId ?? "" }))}
                >
                  {t("openTicket", { ticket: selected.ticketId })}
                </Button>
              )}
              <Button
                size="lg"
                onClick={() => router.push(`/admin/audit/changes?action=${selected.id}`)}
              >
                {t("viewChanges")}
              </Button>
            </SheetFooter>
          </SheetContent>
        )}
      </Sheet>
    </div>
  );
}
