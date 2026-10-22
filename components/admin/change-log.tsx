"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import { X } from "lucide-react";

import { fmtDateTimeParts } from "@/lib/format";
import { downloadCsvText } from "@/lib/export/csv";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetBody,
  SheetContent,
} from "@/components/ui/sheet";
import { DataTable, type ServerTableState } from "@/components/common/data-table";
import { RecordDrawerHeader } from "@/components/common/record-drawer-header";
import { auditTone } from "@/lib/audit/tone";
import { useRecordPager } from "@/lib/use-record-pager";
import { useRecordDetail } from "@/lib/use-record-detail";
import { ProfileCell } from "@/components/common/profile-cell";
import { StatusBadge } from "@/components/common/status-badge";
import { DetailList } from "@/components/common/detail-list";
import { DiffViewer } from "@/components/common/diff-viewer";
import { RecordLink } from "@/components/common/record-link";
import { DateTimeValue } from "@/components/common/date-time-value";
import { DetailSection } from "@/components/common/detail-section";
import { FieldsJsonPanel } from "@/components/common/fields-json-panel";
import { HashValue } from "@/components/common/hash-value";
import { ActionTargetName, RecordName, ReferenceValue } from "@/components/admin/record-refs";
import { actionChangesHref, recordHref, tableRecordKind, targetRecordKind } from "@/lib/record-links";
import { humanizeCode, humanizeLabel } from "@/lib/admin-actions/dto";
import { AdminUserFilter } from "@/components/admin/admin-user-filter";
import { AdminActionFilter } from "@/components/admin/admin-action-filter";
import { changeLogQuery, useChangeLog, usePreviousChange } from "@/lib/admin-actions/queries";
import { changesJson, toJsonText } from "@/lib/admin-actions/export-json";
import { useRetained } from "@/lib/use-retained";
import { getChangeLog, exportChangeLogCsv } from "@/lib/admin-actions/audit-api";
import { CsvExportButton } from "@/components/admin/csv-export-button";
import { LOG_PAGE_SIZE, changeServerStateToParams } from "@/lib/admin-actions/list-params";
import { PeriodFilter } from "@/components/admin/period-filter";
import type { AdminAction, ChangeLogEntry } from "@/lib/admin-actions/types";
import { LoadError } from "@/components/common/load-error";
import { PageContainer } from "@/components/common/page-container";
import { columnWidth } from "@/lib/table/column-widths";
import { RecordDrawerFallback } from "@/components/common/record-drawer-fallback";
import { AdminProfileLink } from "@/components/common/admin-profile-link";
import { useServerPage } from "@/lib/use-server-page";

const OPS: string[] = ["INSERT", "UPDATE", "DELETE"];
const FIELD_PREVIEW = 2;


export function ChangeLog() {
  const t = useTranslations("changeLog");
  const tl = useTranslations("auditLog");
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

  const openId = searchParams.get("open");

  const [server, setServer] = useState<ServerTableState | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(openId);
  const [pinned, setPinned] = useState<ChangeLogEntry | null>(null);
  const params = useMemo(() => changeServerStateToParams(server, actionId), [server, actionId]);
  const changeQuery = useChangeLog(params, selectedId != null);
  const rows = useMemo(() => changeQuery.data?.data ?? [], [changeQuery.data]);
  const total = changeQuery.data?.meta?.total ?? rows.length;
  const onServerStateChange = useCallback((state: ServerTableState) => setServer(state), []);

  const onExport = useCallback(async () => {
    const csv = await exportChangeLogCsv(params);
    downloadCsvText("change-logs.csv", csv);
  }, [params]);

  const detailRef = useRef<HTMLDivElement>(null);
  const {
    data: detail,
    loading: detailLoading,
    error: detailError,
    cause: detailCause,
    reload,
  } = useRecordDetail(selectedId, getChangeLog);
  const liveHead =
    selectedId == null
      ? null
      : (rows.find((entry) => entry.id === selectedId) ??
        (pinned?.id === selectedId ? pinned : null) ??
        (detail?.id === selectedId ? detail : null));
  const selected = useRetained(liveHead);
  useEffect(() => {
    detailRef.current?.scrollTo({ top: 0 });
  }, [selectedId]);
  const openEntry = useCallback((entry: ChangeLogEntry) => setSelectedId(entry.id), []);
  const openPinned = useCallback((entry: ChangeLogEntry) => {
    setPinned(entry);
    setSelectedId(entry.id);
  }, []);
  const close = () => {
    setSelectedId(null);
    if (openId) router.replace(actionId ? actionChangesHref(actionId) : "/admin/audit/changes");
  };
  const loadedDetail = detail && selected && detail.id === selected.id ? detail : null;
  const previousQuery = usePreviousChange(loadedDetail);
  const previous = previousQuery.data ?? null;
  const { controller: tableController, page: serverPage } = useServerPage({
    server,
    pageSize: LOG_PAGE_SIZE,
    total: total,
    data: changeQuery.data,
    failed: changeQuery.isError,
    queryFor: (state) => changeLogQuery(changeServerStateToParams(state, actionId)),
  });
  const pager = useRecordPager({
    rows,
    getId: (entry) => entry.id,
    activeId: selectedId,
    onSelect: openEntry,
    page: serverPage,
  });

  const targetItem = (action: AdminAction, entry: ChangeLogEntry) => {
    if (action.targetUser) {
      const targetUser = action.targetUser;
      return {
        label: tl("colTarget"),
        value: (
          <AdminProfileLink
            id={targetUser.id}
            name={targetUser.name}
            subtitle={[targetUser.username, targetUser.email].filter(Boolean).join(" · ")}
            label={t("openAccount", { name: targetUser.name })}
          />
        ),
      };
    }
    if (!action.targetType) return null;
    const kind = targetRecordKind(action.targetType);
    const isThisRecord = kind === tableRecordKind(entry.table) && action.targetId === entry.recordId;
    if (isThisRecord) return null;
    const fallback = action.payloadName ?? (kind ? t(`recordKind_${kind}`) : humanizeCode(action.targetType));
    const name = <ActionTargetName action={action} fallback={fallback} />;
    return {
      label: tl("colTarget"),
      value: kind && action.targetId ? <RecordLink href={recordHref(kind, action.targetId)}>{name}</RecordLink> : name,
    };
  };

  const diffLabels = useMemo(
    () => ({
      field: t("diffField"),
      before: t("diffBefore"),
      after: t("diffAfter"),
      removed: t("diffRemoved"),
      added: t("diffAdded"),
      empty: t("diffEmpty"),
    }),
    [t],
  );

  const actorCell = (entry: ChangeLogEntry) => (
    <AdminProfileLink
      id={entry.actorId}
      name={entry.actorName}
      subtitle={[entry.actorUsername, entry.actorEmail].filter(Boolean).join(" · ")}
      label={t("openAccount", { name: entry.actorName })}
    />
  );

  const originItems = (entry: ChangeLogEntry) => {
    const action = entry.action;
    const actionName = action?.actionName ?? t("viewAuditLog");
    const target = action ? targetItem(action, entry) : null;
    return [
      {
        label: t("auditEntry"),
        value: entry.actionId ? (
          <RecordLink href={recordHref("auditLog", entry.actionId)} label={t("openAuditEntry", { name: actionName })}>
            <span className="font-medium">{actionName}</span>
          </RecordLink>
        ) : (
          t("noAction")
        ),
      },
      ...(action
        ? [
            {
              label: t("auditResult"),
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
          ]
        : []),
      ...(target ? [target] : []),
      ...(action?.device ? [{ label: tl("detailDevice"), value: action.device }] : []),
      ...(action?.ipHash ? [{ label: tl("detailIpHash"), value: <HashValue value={action.ipHash} short label={tl("detailIpHash")} /> }] : []),
    ];
  };

  const changedRow = (entry: ChangeLogEntry) => {
    const kind = tableRecordKind(entry.table);
    if (!kind) return <span className="break-all">{entry.recordId}</span>;
    return (
      <RecordLink href={recordHref(kind, entry.recordId)}>
        <RecordName kind={kind} id={entry.recordId} fallback={t(`recordKind_${kind}`)} />
      </RecordLink>
    );
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
        ...columnWidth("name"),
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
        ...columnWidth("text", { min: 180, max: 360 }),
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
            <span className="text-xs text-muted-foreground">{t("viewAuditLog")}</span>
          ) : (
            <span className="text-muted-foreground">{t("noAction")}</span>
          );
        },
      },
      {
        id: "table",
        accessorFn: (entry) => tableLabel(entry.table),
        ...columnWidth("label"),
        header: t("colTable"),
        cell: ({ row }) => <span className="block truncate text-sm">{tableLabel(row.original.table)}</span>,
      },
      {
        id: "fields",
        accessorFn: (entry) => entry.changes.map((change) => humanizeLabel(change.column)).join(", "),
        ...columnWidth("text", { min: 180, max: 360 }),
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
        ...columnWidth("text", { min: 160, max: 320 }),
        header: t("colBefore"),
        enableSorting: false,
        cell: ({ row }) => changeCell(row.original, "before"),
      },
      {
        id: "after",
        accessorFn: (entry) => entry.changes[0]?.after ?? "",
        ...columnWidth("text", { min: 160, max: 320 }),
        header: t("colAfter"),
        enableSorting: false,
        cell: ({ row }) => changeCell(row.original, "after"),
      },
    ],
    [t, tc, locale, opLabel, actionTargetText, tableLabel, changeCell],
  );

  return (
    <PageContainer fill>
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
            <LoadError error={changeQuery.error} message={t("loadError")} onRetry={() => changeQuery.refetch()} />
          ) : changeQuery.isPending ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-11 w-full" />
              ))}
            </div>
          ) : (
            <DataTable
              fill
              columns={columns}
              data={rows}
              pageSize={LOG_PAGE_SIZE}
              manualServer
              rowCount={total}
              onServerStateChange={onServerStateChange}
              searchPlaceholder={t("search")}
              emptyLabel={t("empty")}
              itemsLabel={t("items")}
              onRowClick={openEntry}
              rowAriaLabel={(entry) => `${opLabel(entry.operation)} · ${tableLabel(entry.table)}`}
              getRowId={(entry) => entry.id}
              activeRowId={selectedId}
              controllerRef={tableController}
              toolbar={
                <>
                  <PeriodFilter
                    value={server?.columnFilters.find((filter) => filter.id === "timestamp")?.value}
                    onChange={(range) => tableController.current?.setColumnFilter("timestamp", range)}
                  />
                  <CsvExportButton onExport={onExport} />
                </>
              }
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

      <Sheet inspect open={selectedId != null} onOpenChange={(open) => !open && close()}>
        {selectedId != null && liveHead == null ? (
          <RecordDrawerFallback loading={detailLoading} error={detailCause} onRetry={reload} />
        ) : selected && (
          <SheetContent onSwipeNext={() => pager.step(1)} onSwipePrev={() => pager.step(-1)}>
            <RecordDrawerHeader
              pager={pager}
              link={recordHref("changeLog", selected.id)}
              title={selected.action?.actionName || t("untitledChange")}
              subtitle={<span className="tabular">{t("logId", { id: selected.id })}</span>}
              summary={[
                { label: t("colTimestamp"), value: <DateTimeValue epoch={selected.createdAt} locale={locale} /> },
                {
                  label: t("colOperation"),
                  value: (
                    <StatusBadge tone={auditTone(selected.operation)} equalWidth={false}>
                      {opLabel(selected.operation)}
                    </StatusBadge>
                  ),
                },
                { label: t("colFields"), value: t("fieldsCount", { count: selected.changes.length }) },
              ]}
            />
            <SheetBody ref={detailRef} className="flex flex-col gap-6">
              {detailLoading ? (
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="h-28 w-full" />
                </div>
              ) : detailError || !detail ? (
                <LoadError error={detailCause} message={t("loadError")} onRetry={reload} className="py-10" />
              ) : (
                <>
                  <DetailSection title={t("sectionOrigin")}>
                    {actorCell(detail)}
                    <DetailList divided items={originItems(detail)} />
                  </DetailSection>

                  <DetailSection title={t("sectionRecord")}>
                    <DetailList
                      divided
                      items={[
                        { label: t("colTable"), value: tableLabel(detail.table) },
                        { label: t("colRecord"), value: changedRow(detail) },
                        { label: t("colSchema"), value: detail.schema || "-" },
                        {
                          label: t("rowHash"),
                          value: detail.rowHash ? (
                            <HashValue value={detail.rowHash} label={t("rowHash")} />
                          ) : (
                            <span className="font-normal text-muted-foreground">{t("rowHashNone")}</span>
                          ),
                        },
                        {
                          label: t("prevRowHash"),
                          value: detail.prevRowHash ? (
                            <span className="flex min-w-0 flex-col items-start gap-1">
                              <HashValue value={detail.prevRowHash} label={t("prevRowHash")} />
                              {previous && (
                                <Button variant="link" size="sm" className="h-auto px-0" onClick={() => openPinned(previous)}>
                                  {t("openPreviousChange")}
                                </Button>
                              )}
                            </span>
                          ) : (
                            <span className="font-normal text-muted-foreground">{t("prevRowHashNone")}</span>
                          ),
                        },
                      ]}
                    />
                  </DetailSection>

                  <DetailSection title={t("sectionChanges")}>
                    <FieldsJsonPanel
                      title={t("detailDiff")}
                      json={toJsonText(changesJson(detail.changes))}
                      copyJson={() => toJsonText(changesJson(detail.changes))}
                      fields={
                        detail.changes.length === 0 ? (
                          <p className="py-2 text-center text-sm text-muted-foreground">{t("noColumnData")}</p>
                        ) : (
                          <DiffViewer
                            changes={detail.changes}
                            renderValue={renderChangeValue}
                            labelFor={humanizeLabel}
                            labels={diffLabels}
                          />
                        )
                      }
                    />
                  </DetailSection>
                </>
              )}
            </SheetBody>
          </SheetContent>
        )}
      </Sheet>
    </PageContainer>
  );
}
