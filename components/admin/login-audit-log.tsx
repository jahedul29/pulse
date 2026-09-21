"use client";

import { useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";

import { fmtDateTimeParts } from "@/lib/format";
import { downloadCsvText } from "@/lib/export/csv";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type ServerTableState } from "@/components/common/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { ProfileCell } from "@/components/common/profile-cell";
import { AdminUserFilter } from "@/components/admin/admin-user-filter";
import { maskIdentifier } from "@/lib/audit/mask";
import { auditTone } from "@/lib/audit/tone";
import { useLoginAudit } from "@/lib/audit/queries";
import { exportLoginAuditCsv } from "@/lib/audit/audit-api";
import { CsvExportButton } from "@/components/admin/csv-export-button";
import { serverStateToParams } from "@/lib/audit/list-params";
import type { LoginAuditEntry } from "@/lib/audit/types";

const RESULTS: string[] = [
  "SUCCESS",
  "INVALID_CREDENTIALS",
  "ACCOUNT_LOCKED",
  "ACCOUNT_PENDING",
  "ACCOUNT_SUSPENDED",
  "ACCOUNT_DEACTIVATED",
  "MFA_FAILED",
];

const METHODS: string[] = ["PASSWORD_MFA", "REFRESH_TOKEN"];

const NON_FAILURE = new Set<string>(["SUCCESS"]);

function shownIdentifier(entry: LoginAuditEntry): string {
  return entry.adminAccountId ? entry.attemptedIdentifier : maskIdentifier(entry.attemptedIdentifier);
}

function fmtStamp(ms: number, locale: string): string {
  const { time, date } = fmtDateTimeParts(ms, locale);
  return `${date} ${time}`;
}

export function LoginAuditLog() {
  const t = useTranslations("loginAudit");
  const tc = useTranslations("common");
  const locale = useLocale();

  const resultLabel = useCallback(
    (value: string) => (t.has(`result_${value}`) ? t(`result_${value}`) : value),
    [t],
  );
  const methodLabel = useCallback(
    (value: string) => (t.has(`method_${value}`) ? t(`method_${value}`) : value),
    [t],
  );

  const [server, setServer] = useState<ServerTableState | null>(null);
  const params = useMemo(() => serverStateToParams(server), [server]);
  const auditQuery = useLoginAudit(params);
  const rows = useMemo(() => auditQuery.data?.data ?? [], [auditQuery.data]);
  const total = auditQuery.data?.meta?.total ?? rows.length;
  const onServerStateChange = useCallback((state: ServerTableState) => setServer(state), []);

  const onExport = useCallback(async () => {
    const csv = await exportLoginAuditCsv(params);
    downloadCsvText("login-audit-logs.csv", csv);
  }, [params]);

  const flagged = useMemo(() => {
    const set = new Set<string>();
    let start = 0;
    for (let index = 1; index <= rows.length; index++) {
      const prev = rows[index - 1];
      const cur = rows[index];
      const continues =
        cur != null &&
        !NON_FAILURE.has(cur.result) &&
        !NON_FAILURE.has(prev.result) &&
        cur.attemptedIdentifier === prev.attemptedIdentifier;
      if (!continues) {
        if (index - start >= 3 && !NON_FAILURE.has(rows[start].result)) {
          for (let fillIndex = start; fillIndex < index; fillIndex++) set.add(rows[fillIndex].id);
        }
        start = index;
      }
    }
    return set;
  }, [rows]);

  const columns = useMemo<ColumnDef<LoginAuditEntry, unknown>[]>(
    () => [
      {
        id: "admin",
        accessorFn: (entry) => entry.adminName ?? t("unmatchedAdmin"),
        size: 200,
        header: t("colAdmin"),
        enableSorting: false,
        meta: {
          filter: "select",
          filterLabel: t("colAdmin"),
          renderFilter: ({ value, setValue, searchLabel }) => (
            <AdminUserFilter value={value} onChange={setValue} searchLabel={searchLabel} emptyLabel={tc("noResults")} />
          ),
        },
        cell: ({ row }) =>
          row.original.adminName ? (
            <ProfileCell name={row.original.adminName} />
          ) : (
            <ProfileCell name={t("unmatchedAdmin")} unmatched />
          ),
      },
      {
        id: "identifier",
        accessorFn: (entry) => entry.attemptedIdentifier,
        size: 230,
        header: t("colIdentifier"),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">{shownIdentifier(row.original)}</span>
        ),
      },
      {
        id: "result",
        accessorFn: (entry) => entry.result,
        size: 200,
        header: t("colResult"),
        meta: {
          filter: "select",
          filterOptions: RESULTS.map((result) => ({ value: result, label: resultLabel(result) })),
          filterLabel: t("colResult"),
        },
        cell: ({ row }) => (
          <StatusBadge tone={auditTone(row.original.result)} equalWidth={false} className="min-w-[8rem]">
            {resultLabel(row.original.result)}
          </StatusBadge>
        ),
      },
      {
        id: "method",
        accessorFn: (entry) => entry.method,
        size: 150,
        header: t("colMethod"),
        meta: {
          filter: "select",
          filterOptions: METHODS.map((method) => ({ value: method, label: methodLabel(method) })),
          filterLabel: t("colMethod"),
        },
        cell: ({ row }) => <span className="text-sm">{methodLabel(row.original.method)}</span>,
      },
      {
        id: "timestamp",
        accessorFn: (entry) => entry.createdAt,
        size: 172,
        header: t("colTimestamp"),
        cell: ({ row }) => (
          <span className="text-xs whitespace-nowrap tabular">
            {fmtStamp(row.original.createdAt, locale)}
          </span>
        ),
      },
    ],
    [t, tc, locale, resultLabel, methodLabel],
  );

  return (
    <div className="mx-auto max-w-7xl">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {auditQuery.isError ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-sm text-muted-foreground">{t("loadError")}</p>
              <Button variant="outline" size="sm" onClick={() => auditQuery.refetch()}>
                {tc("retry")}
              </Button>
            </div>
          ) : auditQuery.isPending ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 8 }).map((_, index) => (
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
              getSearchText={(entry) => `${shownIdentifier(entry)} ${entry.adminName ?? ""}`}
              toolbar={<CsvExportButton onExport={onExport} />}
              filterLabels={{
                filter: t("filter"),
                clear: t("clear"),
                clearFilters: tc("clearFilters"),
                search: t("filterSearch"),
                from: t("dateFrom"),
                to: t("dateTo"),
              }}
              enableFreeze
              maxFreeze={3}
              rowClassName={(entry) =>
                flagged.has(entry.id)
                  ? "[&>td:first-child]:border-s-2 [&>td:first-child]:border-danger/60"
                  : undefined
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
