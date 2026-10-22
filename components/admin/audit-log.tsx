"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";

import { fmtDateTimeParts } from "@/lib/format";
import { downloadCsvText } from "@/lib/export/csv";
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
import { useRetained } from "@/lib/use-retained";
import { StatusBadge } from "@/components/common/status-badge";
import { ProfileCell } from "@/components/common/profile-cell";
import { DetailList } from "@/components/common/detail-list";
import { Chip } from "@/components/common/chip";
import { RecordLink } from "@/components/common/record-link";
import { DateTimeValue } from "@/components/common/date-time-value";
import { DetailSection } from "@/components/common/detail-section";
import { FieldsJsonPanel } from "@/components/common/fields-json-panel";
import { HashValue } from "@/components/common/hash-value";
import { ActionTargetName, ReferenceValue, RoleNameChips } from "@/components/admin/record-refs";
import { actionChangesHref, isHttpRoute, recordHref, targetRecordKind } from "@/lib/record-links";
import { humanizeCode, meaningfulInputs } from "@/lib/admin-actions/dto";
import { AdminUserFilter } from "@/components/admin/admin-user-filter";
import {
  adminActionsQuery,
  useActionChangeCount,
  useActionFilterOptions,
  useAdminActions,
} from "@/lib/admin-actions/queries";
import { jsonPreview, toJsonText } from "@/lib/admin-actions/export-json";
import { getAdminAction, exportAdminActionsCsv } from "@/lib/admin-actions/audit-api";
import { CsvExportButton } from "@/components/admin/csv-export-button";
import { LOG_PAGE_SIZE, actionServerStateToParams } from "@/lib/admin-actions/list-params";
import { PeriodFilter } from "@/components/admin/period-filter";
import { TARGET_SERVICES, type AdminAction } from "@/lib/admin-actions/types";
import { LoadError } from "@/components/common/load-error";
import { PageContainer } from "@/components/common/page-container";
import { columnWidth } from "@/lib/table/column-widths";
import { RecordDrawerFallback } from "@/components/common/record-drawer-fallback";
import { AdminProfileLink } from "@/components/common/admin-profile-link";
import { useServerPage } from "@/lib/use-server-page";

const RESULTS: string[] = ["SUCCESS", "PARTIAL", "FAILURE"];
const SEVERITIES: string[] = ["INFO", "WARNING", "CRITICAL"];

function NameChips({ names }: { names: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 py-0.5">
      {names.map((name, index) => (
        <Chip key={`${name}-${index}`} className="leading-snug whitespace-normal">
          {name}
        </Chip>
      ))}
    </div>
  );
}

export function AuditLog() {
  const t = useTranslations("auditLog");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  const resultLabel = useCallback(
    (value: string) => (t.has(`result_${value}`) ? t(`result_${value}`) : value),
    [t],
  );
  const refFallbacks = useMemo(
    () => ({
      admin: t("refAdminAccount"),
      template: t("refTemplate"),
      alertRoute: t("refAlertRoute"),
      region: t("refRegion"),
      country: t("refCountry"),
    }),
    [t],
  );
  const severityLabel = useCallback(
    (value: string) => (t.has(`severity_${value}`) ? t(`severity_${value}`) : value),
    [t],
  );
  const targetFallback = useCallback(
    (action: AdminAction) =>
      action.payloadName ?? (targetRecordKind(action.targetType) === "securityPolicy" ? t("targetSecurityPolicy") : "-"),
    [t],
  );

  const searchParams = useSearchParams();
  const openId = searchParams.get("open");

  const [server, setServer] = useState<ServerTableState | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(openId);
  const params = useMemo(() => actionServerStateToParams(server), [server]);
  const actionsQuery = useAdminActions(params, selectedId != null);
  const filterOptionsQuery = useActionFilterOptions();
  const actionCodeOptions = useMemo(
    () => (filterOptionsQuery.data?.actionCodes ?? []).map((code) => ({ value: code, label: code })),
    [filterOptionsQuery.data],
  );
  const targetTypeOptions = useMemo(
    () => (filterOptionsQuery.data?.targetTypes ?? []).map((type) => ({ value: type, label: humanizeCode(type) })),
    [filterOptionsQuery.data],
  );
  const rows = useMemo(() => actionsQuery.data?.data ?? [], [actionsQuery.data]);
  const total = actionsQuery.data?.meta?.total ?? rows.length;
  const onServerStateChange = useCallback((state: ServerTableState) => setServer(state), []);

  const onExport = useCallback(async () => {
    const csv = await exportAdminActionsCsv(params);
    downloadCsvText("audit-log.csv", csv);
  }, [params]);

  const index = selectedId ? rows.findIndex((action) => action.id === selectedId) : -1;
  const detailRef = useRef<HTMLDivElement>(null);
  const {
    data: detail,
    loading: detailLoading,
    error: detailError,
    cause: detailCause,
    reload,
  } = useRecordDetail(selectedId, getAdminAction);
  const liveHead = (index >= 0 ? rows[index] : null) ?? detail ?? null;
  const selected = useRetained(liveHead);
  useEffect(() => {
    detailRef.current?.scrollTo({ top: 0 });
  }, [selectedId]);
  const close = () => {
    setSelectedId(null);
    if (openId) router.replace("/admin/audit/log");
  };
  const loadedDetail = detail && selected && detail.id === selected.id ? detail : null;
  const changeCountQuery = useActionChangeCount(loadedDetail?.id ?? null);
  const changeCount = changeCountQuery.data ?? 0;
  const targetValue = (action: AdminAction) => {
    const targetUser = action.targetUser;
    if (targetUser) {
      return (
        <AdminProfileLink
          id={targetUser.id}
          name={targetUser.name}
          subtitle={[targetUser.username, targetUser.email].filter(Boolean).join(" · ")}
          label={t("openAccount", { name: targetUser.name })}
        />
      );
    }
    const kind = targetRecordKind(action.targetType);
    const name = <ActionTargetName action={action} fallback={targetFallback(action)} />;
    return kind && action.targetId ? <RecordLink href={recordHref(kind, action.targetId)}>{name}</RecordLink> : name;
  };
  const changeItems = (action: AdminAction) => [
    ...(action.summary && !isHttpRoute(action.summary) ? [{ label: t("detailSummary"), value: action.summary }] : []),
    ...(action.roleNames.length > 0
      ? [{ label: t("detailRoles", { count: action.roleNames.length }), value: <RoleNameChips names={action.roleNames} /> }]
      : []),
    ...(action.permissionNames.length > 0
      ? [
          {
            label: t("detailPermissions", { count: action.permissionNames.length }),
            value: <NameChips names={action.permissionNames} />,
          },
        ]
      : []),
    ...(changeCount > 0
      ? [
          {
            label: t("dbChanges"),
            value: <RecordLink href={actionChangesHref(action.id)}>{t("dbChangesCount", { count: changeCount })}</RecordLink>,
          },
        ]
      : []),
  ];
  const { controller: tableController, page: serverPage } = useServerPage({
    server,
    pageSize: LOG_PAGE_SIZE,
    total: total,
    data: actionsQuery.data,
    failed: actionsQuery.isError,
    queryFor: (state) => adminActionsQuery(actionServerStateToParams(state)),
  });
  const selectAction = useCallback((action: AdminAction) => setSelectedId(action.id), []);
  const pager = useRecordPager({
    rows,
    getId: (action) => action.id,
    activeId: selectedId,
    onSelect: selectAction,
    page: serverPage,
  });

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
        id: "actor",
        accessorFn: (action) => action.actorName,
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
        id: "actionCode",
        accessorFn: (action) => action.actionName,
        ...columnWidth("text", { min: 180, max: 360 }),
        header: t("colActionCode"),
        meta: { filter: "select", filterOptions: actionCodeOptions, filterLabel: t("colActionCode") },
        cell: ({ row }) => <span className="block truncate text-sm font-medium">{row.original.actionName}</span>,
      },
      {
        id: "targetType",
        accessorFn: (action) => humanizeCode(action.targetType),
        ...columnWidth("label"),
        header: t("detailTargetType"),
        meta: { filter: "select", filterOptions: targetTypeOptions, filterLabel: t("detailTargetType") },
        cell: ({ row }) => <span className="block truncate text-sm">{humanizeCode(row.original.targetType) || "-"}</span>,
      },
      {
        id: "target",
        accessorFn: (action) => action.targetUser?.name ?? action.payloadName ?? "",
        ...columnWidth("name"),
        header: t("colTarget"),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="block truncate text-sm font-medium">
            <ActionTargetName action={row.original} fallback={targetFallback(row.original)} />
          </span>
        ),
      },
      {
        id: "service",
        accessorFn: (action) => action.serviceLabel ?? "",
        ...columnWidth("label"),
        header: t("colService"),
        enableSorting: false,
        meta: {
          filter: "select",
          filterOptions: TARGET_SERVICES.map((service) => ({ value: service, label: humanizeCode(service) })),
          filterLabel: t("colService"),
        },
        cell: ({ row }) => <span className="block truncate text-sm">{row.original.serviceLabel || "-"}</span>,
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
    [t, tc, locale, resultLabel, severityLabel, actionCodeOptions, targetTypeOptions, targetFallback],
  );

  return (
    <PageContainer fill>
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {actionsQuery.isError ? (
            <LoadError error={actionsQuery.error} message={t("loadError")} onRetry={() => actionsQuery.refetch()} />
          ) : actionsQuery.isPending ? (
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
              onRowClick={(action) => setSelectedId(action.id)}
              rowAriaLabel={(action) => action.actionName}
              getRowId={(action) => action.id}
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
              getSearchText={(action) =>
                `${action.actionName} ${action.summary} ${action.actorName} ${action.targetUser?.name ?? ""}`
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
              link={recordHref("auditLog", selected.id)}
              title={selected.actionName}
              subtitle={<span className="tabular">{t("logId", { id: selected.id })}</span>}
              summary={[
                { label: t("colTimestamp"), value: <DateTimeValue epoch={selected.createdAt} locale={locale} /> },
                {
                  label: t("colResult"),
                  value: (
                    <StatusBadge tone={auditTone(selected.result)} equalWidth={false}>
                      {resultLabel(selected.result)}
                    </StatusBadge>
                  ),
                },
                {
                  label: t("colSeverity"),
                  value: (
                    <StatusBadge tone={auditTone(selected.severity)} equalWidth={false}>
                      {severityLabel(selected.severity)}
                    </StatusBadge>
                  ),
                },
              ]}
            />
            <SheetBody ref={detailRef} className="flex flex-col gap-6">
              {detailLoading ? (
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : detailError || !detail ? (
                <LoadError error={detailCause} message={t("loadError")} onRetry={reload} className="py-10" />
              ) : (
                <>
                  <DetailSection title={t("sectionUser")}>
                    <AdminProfileLink
                      id={detail.actorId}
                      name={detail.actorName}
                      subtitle={detail.adminEmail}
                      label={t("openAccount", { name: detail.actorName })}
                    />
                    <DetailList
                      divided
                      items={[
                        { label: t("detailDevice"), value: detail.device || "-" },
                        { label: t("detailIpHash"), value: detail.ipHash ? <HashValue value={detail.ipHash} short label={t("detailIpHash")} /> : "-" },
                      ]}
                    />
                  </DetailSection>

                  <DetailSection title={t("sectionTarget")}>
                    <DetailList
                      divided
                      items={[
                        { label: t("detailTargetType"), value: humanizeCode(detail.targetType) || "-" },
                        { label: t("colTarget"), value: targetValue(detail) },
                      ]}
                    />
                  </DetailSection>

                  <DetailSection title={t("sectionChange")}>
                    {changeItems(detail).length > 0 && <DetailList divided items={changeItems(detail)} />}
                    <FieldsJsonPanel
                      title={t("detailPayload")}
                      json={toJsonText(jsonPreview(detail.payload, (count) => tc("moreItems", { count })))}
                      copyJson={() => toJsonText(detail.payload)}
                      fields={
                        meaningfulInputs(detail).length === 0 ? (
                          <p className="py-2 text-center text-sm text-muted-foreground">{t("noPayload")}</p>
                        ) : (
                          <DetailList
                            divided
                            items={meaningfulInputs(detail).map((input) => ({
                              label: input.label,
                              value: (
                                <ReferenceValue fieldKey={input.key} value={input.value} locale={locale} fallbacks={refFallbacks} />
                              ),
                            }))}
                          />
                        )
                      }
                    />
                  </DetailSection>

                  <DetailSection title={t("sectionServiceTracing")}>
                    <DetailList
                      divided
                      items={[
                        { label: t("colService"), value: detail.serviceLabel || "-" },
                        {
                          label: t("detailCorrelationId"),
                          value: detail.correlationId ? <HashValue value={detail.correlationId} label={t("detailCorrelationId")} /> : "-",
                        },
                      ]}
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
