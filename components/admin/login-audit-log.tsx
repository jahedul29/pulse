"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import { Download } from "lucide-react";

import { fmtDateTimeParts } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DataTable, toolbarIconButtonClass } from "@/components/common/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { ProfileCell } from "@/components/common/profile-cell";
import { exportCsv } from "@/lib/export/csv";
import { maskIdentifier } from "@/lib/audit/mask";
import { fetchLoginAudit, auditAdminOptions } from "@/lib/audit/api";
import type { LoginAuditEntry } from "@/lib/audit/types";
import type { LoginResult } from "@/lib/auth/types";

type Tone = "success" | "warning" | "danger" | "neutral";

const RESULTS: LoginResult[] = [
  "SUCCESS",
  "MFA_REQUIRED",
  "INVALID_CREDENTIALS",
  "ACCOUNT_LOCKED",
  "ACCOUNT_SUSPENDED",
  "ACCOUNT_DEACTIVATED",
  "ACCOUNT_PENDING",
  "SERVER_ERROR",
];

const NON_FAILURE = new Set<LoginResult>(["SUCCESS", "MFA_REQUIRED", "ACCOUNT_UNLOCKED"]);

function resultTone(result: LoginResult): Tone {
  if (result === "SUCCESS") return "success";
  if (result === "ACCOUNT_LOCKED") return "warning";
  if (result === "ACCOUNT_UNLOCKED") return "neutral";
  return "danger";
}

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
  const [rows, setRows] = useState<LoginAuditEntry[]>([]);

  useEffect(() => {
    let active = true;
    fetchLoginAudit().then((fetchedRows) => {
      if (active) setRows(fetchedRows);
    });
    return () => {
      active = false;
    };
  }, []);

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

  const adminOptions = useMemo(() => {
    const names = auditAdminOptions().map((admin) => ({ value: admin.name, label: admin.name }));
    return [...names, { value: t("unmatchedAdmin"), label: t("unmatchedAdmin") }];
  }, [t]);

  const columns = useMemo<ColumnDef<LoginAuditEntry, unknown>[]>(
    () => [
      {
        id: "admin",
        accessorFn: (entry) => entry.adminName ?? t("unmatchedAdmin"),
        size: 200,
        header: t("colAdmin"),
        meta: { filter: "select", filterOptions: adminOptions, filterLabel: t("colAdmin") },
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
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">{shownIdentifier(row.original)}</span>
        ),
      },
      {
        id: "result",
        accessorFn: (entry) => entry.result,
        size: 170,
        header: t("colResult"),
        meta: {
          filter: "select",
          filterOptions: RESULTS.map((result) => ({ value: result, label: t(`result_${result}`) })),
          filterLabel: t("colResult"),
        },
        cell: ({ row }) => (
          <StatusBadge tone={resultTone(row.original.result)} equalWidth={false} className="min-w-[8rem]">
            {t(`result_${row.original.result}`)}
          </StatusBadge>
        ),
      },
      {
        id: "method",
        accessorFn: (entry) => entry.method,
        size: 150,
        header: t("colMethod"),
        cell: ({ row }) => <span className="text-sm">{t(`method_${row.original.method}`)}</span>,
      },
      {
        id: "timestamp",
        accessorFn: (entry) => entry.createdAt,
        size: 172,
        header: t("colTimestamp"),
        meta: { filter: "dateRange", filterLabel: t("colTimestamp") },
        cell: ({ row }) => (
          <span className="text-xs whitespace-nowrap tabular">
            {fmtStamp(row.original.createdAt, locale)}
          </span>
        ),
      },
    ],
    [t, locale, adminOptions],
  );

  const onExport = (exportRows: LoginAuditEntry[]) => {
    const headers = [
      t("colAdmin"),
      t("colIdentifier"),
      t("colResult"),
      t("colMethod"),
      t("colTimestamp"),
      "IP",
    ];
    const csvRows = exportRows.map((entry) => [
      entry.adminName ?? t("unmatchedAdmin"),
      shownIdentifier(entry),
      t(`result_${entry.result}`),
      t(`method_${entry.method}`),
      fmtStamp(entry.createdAt, locale),
      entry.ip,
    ]);
    exportCsv("login-audit.csv", headers, csvRows);
  };

  return (
    <div className="mx-auto max-w-7xl">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={rows}
            pageSize={10}
            searchPlaceholder={t("search")}
            emptyLabel={t("empty")}
            itemsLabel={t("items")}
            getSearchText={(entry) => `${shownIdentifier(entry)} ${entry.adminName ?? ""} ${entry.ip}`}
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
        </CardContent>
      </Card>
    </div>
  );
}
