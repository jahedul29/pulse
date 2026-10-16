"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  SheetDescription,
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
import { Chip } from "@/components/common/chip";
import { RecordLink } from "@/components/common/record-link";
import { ReferenceCode } from "@/components/common/reference-code";
import { ActionTargetName, ReferenceValue, RoleNameChips } from "@/components/admin/record-refs";
import { recordHref, tableRecordKind, targetRecordKind } from "@/lib/record-links";
import { humanizeCode, humanizeLabel } from "@/lib/admin-actions/dto";
import { AdminUserFilter } from "@/components/admin/admin-user-filter";
import { AdminActionFilter } from "@/components/admin/admin-action-filter";
import { useChangeLog } from "@/lib/admin-actions/queries";
import { getChangeLog, exportChangeLogCsv } from "@/lib/admin-actions/audit-api";
import { CsvExportButton } from "@/components/admin/csv-export-button";
import { changeServerStateToParams } from "@/lib/admin-actions/list-params";
import type { AdminAction, ChangeLogEntry } from "@/lib/admin-actions/types";

const OPS: string[] = ["INSERT", "UPDATE", "DELETE"];
const FIELD_PREVIEW = 2;


function ChipSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h5 className="text-xs font-medium text-muted-foreground">{title}</h5>
      {children}
    </div>
  );
}

export function ChangeLog() {
  const t = useTranslations("changeLog");
  const tl = useTranslations("actionLog");
  const tc = useTranslations("common");
  const locale = useLocale();
  const resultLabel = useCallback(
    (value: string) => (tl.has(`result_${value}`) ? tl(`result_${value}`) : value),
    [tl],
  );
  const severityLabel = useCallback(
    (value: string) => (tl.has(`severity_${value}`) ? tl(`severity_${value}`) : value),
    [tl],
  );
  const refFallbacks = useMemo(
    () => ({
      admin: t("recordKind_adminAccount"),
      template: t("recordKind_template"),
      alertRoute: t("recordKind_alertRoute"),
      role: t("recordKind_role"),
      region: t("recordKind_region"),
      country: t("recordKind_country"),
    }),
    [t],
  );
  const renderChangeValue = useCallback(
    (value: string, column: string): ReactNode => (
      <ReferenceValue fieldKey={column} value={value} locale={locale} fallbacks={refFallbacks} />
    ),
    [locale, refFallbacks],
  );
  const tableLabel = useCallback(
    (table: string) => (t.has(`table_${table}`) ? t(`table_${table}`) : humanizeCode(table)),
    [t],
  );
  const changeCell = useCallback(
    (entry: ChangeLogEntry, side: "before" | "after"): ReactNode => {
      const first = entry.changes[0];
      if (!first) return <span className="text-muted-foreground">-</span>;
      const value = side === "before" ? first.before : first.after;
      return (
        <div className="flex min-w-0 flex-col">
          <span className="block truncate text-xs font-medium">
            {value == null ? (
              "-"
            ) : (
              <ReferenceValue plain fieldKey={first.column} value={value} locale={locale} fallbacks={refFallbacks} />
            )}
          </span>
          <span className="block truncate text-xs text-muted-foreground">{humanizeLabel(first.column)}</span>
        </div>
      );
    },
    [locale, refFallbacks],
  );
  const actionTargetText = useCallback(
    (entry: ChangeLogEntry): string | null => {
      const action = entry.action;
      if (!action) return null;
      if (action.targetUser) return action.targetUser.name;
      const kind = targetRecordKind(action.targetType);
      return kind ? t(`recordKind_${kind}`) : humanizeCode(action.targetType) || null;
    },
    [t],
  );

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

  const targetItem = (action: AdminAction, entry: ChangeLogEntry) => {
    if (action.targetUser) {
      const targetUser = action.targetUser;
      const cell = (
        <ProfileCell
          name={targetUser.name}
          subtitle={[targetUser.username, targetUser.email].filter(Boolean).join(" · ") || undefined}
        />
      );
      return {
        label: tl("colTarget"),
        value: targetUser.id ? (
          <RecordLink
            href={recordHref("adminAccount", targetUser.id)}
            label={t("openAccount", { name: targetUser.name })}
          >
            {cell}
          </RecordLink>
        ) : (
          cell
        ),
      };
    }
    if (!action.targetType) return null;
    const kind = targetRecordKind(action.targetType);
    const isThisRecord = kind === tableRecordKind(entry.table) && action.targetId === entry.recordId;
    const fallback = action.payloadName ?? (kind ? t(`recordKind_${kind}`) : humanizeCode(action.targetType));
    const name = <ActionTargetName action={action} fallback={fallback} />;
    return {
      label: tl("colTarget"),
      value: kind && action.targetId && !isThisRecord ? <RecordLink href={recordHref(kind, action.targetId)}>{name}</RecordLink> : name,
    };
  };

  const linkedActionItems = (action: AdminAction, entry: ChangeLogEntry) => {
    const target = targetItem(action, entry);
    return [
      {
        label: tl("colResult"),
        value: (
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone={auditTone(action.result)} equalWidth={false}>
              {resultLabel(action.result)}
            </StatusBadge>
            <StatusBadge tone={auditTone(action.severity)} equalWidth={false}>
              {severityLabel(action.severity)}
            </StatusBadge>
          </div>
        ),
      },
      ...(target ? [target] : []),
      ...(action.device ? [{ label: tl("detailDevice"), value: action.device }] : []),
    ];
  };

  const columns = useMemo<ColumnDef<ChangeLogEntry, unknown>[]>(
    () => [
      {
        id: "timestamp",
        accessorFn: (entry) => entry.createdAt,
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
        accessorFn: (entry) => entry.action?.actionName ?? entry.actionCode ?? "",
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
        cell: ({ row }) => {
          const label = row.original.action?.actionName ?? row.original.actionCode;
          const target = actionTargetText(row.original);
          return label ? (
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-xs font-medium">{label}</span>
              {target && <span className="truncate text-xs text-muted-foreground">{target}</span>}
            </div>
          ) : row.original.actionId ? (
            <span className="text-xs text-muted-foreground">{t("viewAction")}</span>
          ) : (
            <span className="text-muted-foreground">{t("noAction")}</span>
          );
        },
      },
      {
        id: "table",
        accessorFn: (entry) => tableLabel(entry.table),
        size: 160,
        header: t("colTable"),
        cell: ({ row }) => <span className="block truncate text-sm">{tableLabel(row.original.table)}</span>,
      },
      {
        id: "fields",
        accessorFn: (entry) => entry.changes.map((change) => humanizeLabel(change.column)).join(", "),
        size: 200,
        header: t("colFields"),
        enableSorting: false,
        cell: ({ row }) => {
          const names = row.original.changes.map((change) => humanizeLabel(change.column));
          if (names.length === 0) return <span className="text-muted-foreground">-</span>;
          const extra = names.length - FIELD_PREVIEW;
          return (
            <span className="block truncate text-xs">
              {names.slice(0, FIELD_PREVIEW).join(", ")}
              {extra > 0 && <span className="text-muted-foreground"> {t("moreFields", { count: extra })}</span>}
            </span>
          );
        },
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
        id: "before",
        accessorFn: (entry) => entry.changes[0]?.before ?? "",
        size: 170,
        header: t("colBefore"),
        enableSorting: false,
        cell: ({ row }) => changeCell(row.original, "before"),
      },
      {
        id: "after",
        accessorFn: (entry) => entry.changes[0]?.after ?? "",
        size: 170,
        header: t("colAfter"),
        enableSorting: false,
        cell: ({ row }) => changeCell(row.original, "after"),
      },
    ],
    [t, tc, locale, opLabel, actionTargetText, tableLabel, changeCell],
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
              rowAriaLabel={(entry) => `${opLabel(entry.operation)} · ${tableLabel(entry.table)}`}
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
              <SheetTitle>{selected.action?.actionName || selected.table}</SheetTitle>
              <SheetDescription className="sr-only">{selected.table}</SheetDescription>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <StatusBadge tone={auditTone(selected.operation)} equalWidth={false}>
                  {opLabel(selected.operation)}
                </StatusBadge>
              </div>
            </SheetHeader>
            <SheetBody ref={detailRef} className="flex flex-col gap-5">
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
                        label: t("colActor"),
                        value: (() => {
                          const cell = (
                            <ProfileCell
                              name={detail.actorName}
                              subtitle={[detail.actorUsername, detail.actorEmail].filter(Boolean).join(" · ") || undefined}
                            />
                          );
                          return detail.actorId ? (
                            <RecordLink
                              href={recordHref("adminAccount", detail.actorId)}
                              label={t("openAccount", { name: detail.actorName })}
                            >
                              {cell}
                            </RecordLink>
                          ) : (
                            cell
                          );
                        })(),
                      },
                      {
                        label: t("colTimestamp"),
                        value: (() => {
                          const { date, time } = fmtDateTimeParts(detail.createdAt, locale);
                          return `${date} ${time}`;
                        })(),
                      },
                      { label: t("colTable"), value: tableLabel(detail.table) },
                      { label: t("detailId"), value: <span className="tabular">{detail.id}</span> },
                      { label: t("colSchema"), value: detail.schema || "-" },
                      {
                        label: t("colRecord"),
                        value: (() => {
                          const kind = tableRecordKind(detail.table);
                          return kind ? (
                            <RecordLink href={recordHref(kind, detail.recordId)}>{t(`recordKind_${kind}`)}</RecordLink>
                          ) : (
                            <span className="break-all">{detail.recordId}</span>
                          );
                        })(),
                      },
                      {
                        label: t("prevRowHash"),
                        value: detail.prevRowHash ? (
                          <ReferenceCode value={detail.prevRowHash} />
                        ) : (
                          <span className="font-normal text-muted-foreground">{t("prevRowHashNone")}</span>
                        ),
                      },
                      {
                        label: t("rowHash"),
                        value: detail.rowHash ? (
                          <ReferenceCode value={detail.rowHash} />
                        ) : (
                          <span className="font-normal text-muted-foreground">{t("rowHashNone")}</span>
                        ),
                      },
                    ]}
                  />

                  {detail.actionId && (
                    <section className="flex flex-col gap-3">
                      <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        {t("linkedAction")}
                      </h4>
                      <DetailList
                        items={[
                          {
                            label: t("colAction"),
                            value: (
                              <RecordLink
                                href={recordHref("actionLog", detail.actionId)}
                                label={t("openAction", { name: detail.action?.actionName ?? t("viewAction") })}
                              >
                                <span className="font-medium">{detail.action?.actionName ?? t("viewAction")}</span>
                              </RecordLink>
                            ),
                          },
                          ...(detail.action ? linkedActionItems(detail.action, detail) : []),
                        ]}
                      />
                      {detail.action && detail.action.roleNames.length > 0 && (
                        <ChipSection title={tl("detailRoles", { count: detail.action.roleNames.length })}>
                          <RoleNameChips names={detail.action.roleNames} />
                        </ChipSection>
                      )}
                      {detail.action && detail.action.permissionNames.length > 0 && (
                        <ChipSection title={tl("detailPermissions", { count: detail.action.permissionNames.length })}>
                          <div className="flex flex-wrap gap-1.5">
                            {detail.action.permissionNames.map((name, index) => (
                              <Chip key={`${name}-${index}`} className="leading-snug whitespace-normal">
                                {name}
                              </Chip>
                            ))}
                          </div>
                        </ChipSection>
                      )}
                    </section>
                  )}

                  <section className="flex flex-col gap-2">
                    <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      {t("detailDiff")}
                    </h4>
                    {detail.changes.length === 0 ? (
                      <p className="rounded-lg border bg-muted/30 px-3 py-4 text-center text-sm text-muted-foreground">
                        {t("noColumnData")}
                      </p>
                    ) : (
                      <DiffViewer changes={detail.changes} renderValue={renderChangeValue} />
                    )}
                  </section>
                </>
              )}
            </SheetBody>
          </SheetContent>
        )}
      </Sheet>
    </div>
  );
}
