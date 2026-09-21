"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type SyntheticEvent } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronDown, ChevronUp, MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useRetained } from "@/lib/use-retained";
import { DataTable, toolbarIconButtonClass, type ServerTableState } from "@/components/common/data-table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ProfileCell } from "@/components/common/profile-cell";
import { Chip } from "@/components/common/chip";
import { StatusBadge, type Tone } from "@/components/common/status-badge";
import { DetailList } from "@/components/common/detail-list";
import { Field } from "@/components/ui/field";
import { InviteAdminDialog } from "@/components/admin/invite-admin-dialog";
import { fmtRelative, fmtDateTime, fmtDateTimeParts } from "@/lib/format";
import { useLanguageLabel } from "@/lib/i18n/language";
import { stepIndex } from "@/lib/paging";
import { useRecordDetail } from "@/lib/use-record-detail";
import { useAuthStore } from "@/lib/auth/store";
import {
  useAdminUsers,
  usePendingInvitations,
  useResendInvitation,
  useRevokeInvitation,
  useUpdateUserStatus,
  useUserDevices,
} from "@/lib/user-management/queries";
import { apiErrorMessage } from "@/lib/api/error-message";
import { ApiError } from "@/lib/api/errors";
import { fetchAdminUserDetail, fetchInvitation } from "@/lib/user-management/users-api";
import { serverStateToParams } from "@/lib/user-management/list-params";
import { userDetailToDetail } from "@/lib/user-management/dto";
import { useRoles } from "@/lib/rbac/queries";
import { useHasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import type { AdminUserRow, AdminUserStatus, EffectiveStatus } from "@/lib/user-management/types";

const CONFIRM_WORD = "DEACTIVATE";

const STATUS_TONE: Record<EffectiveStatus, Tone> = {
  pending: "neutral",
  active: "success",
  suspended: "warning",
  deactivated: "danger",
  revoked: "neutral",
  expired: "warning",
  locked: "danger",
};

const STATUS_FILTER: AdminUserStatus[] = ["pending", "active", "suspended", "deactivated"];

export function UserManagement() {
  const t = useTranslations("userManagement");
  const tc = useTranslations("common");
  const ta = useTranslations("apiErrors");
  const languageLabel = useLanguageLabel();
  const locale = useLocale();

  const selfEmail = useAuthStore((state) => state.session?.email?.toLowerCase() ?? "");
  const canManage = useHasPermission(PERMISSIONS.USER_MANAGEMENT_EDIT);

  const [server, setServer] = useState<ServerTableState | null>(null);
  const params = useMemo(() => serverStateToParams(server), [server]);
  const usersQuery = useAdminUsers(params);
  const rows = useMemo(() => usersQuery.data?.data ?? [], [usersQuery.data]);
  const pendingQuery = usePendingInvitations();
  const total = usersQuery.data?.meta?.total ?? rows.length;
  const loading = usersQuery.isPending;
  const error = usersQuery.isError;
  const onServerStateChange = useCallback((state: ServerTableState) => setServer(state), []);

  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 30_000);
    return () => clearInterval(timer);
  }, []);

  const { mutate: mutateStatus, mutateAsync: mutateStatusAsync, isPending: statusPending } =
    useUpdateUserStatus();
  const { mutateAsync: mutateRevokeAsync, isPending: revokePending } = useRevokeInvitation();
  const { mutateAsync: mutateResendAsync, isPending: resendPending } = useResendInvitation();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [revoking, setRevoking] = useState<AdminUserRow | null>(null);
  const [deactivating, setDeactivating] = useState<AdminUserRow | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const active = selectedIndex == null ? null : (rows[selectedIndex] ?? null);
  const [retained, setRetained] = useState<AdminUserRow | null>(null);
  const selected = active ?? retained;
  const devicesQuery = useUserDevices(selected?.id ?? null);

  const [selectedInvite, setSelectedInvite] = useState<AdminUserRow | null>(null);
  const shownInvite = useRetained(selectedInvite);
  const loadInvitation = useCallback((id: string) => fetchInvitation(id), []);
  const {
    data: inviteDetail,
    loading: inviteLoading,
    error: inviteError,
    reload: inviteReload,
  } = useRecordDetail(selectedInvite?.id ?? null, loadInvitation);
  const detailRef = useRef<HTMLDivElement>(null);
  const loadDetail = useCallback(
    (id: string) => fetchAdminUserDetail(id).then(userDetailToDetail),
    [],
  );
  const { data: detail, loading: detailLoading, error: detailError, reload } = useRecordDetail(
    selected?.id ?? null,
    loadDetail,
  );

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

  const rolesQuery = useRoles({ page: 1, perPage: 100 });
  const roleOptions = useMemo(
    () => (rolesQuery.data?.data ?? []).map((role) => ({ value: String(role.id), label: role.name })),
    [rolesQuery.data],
  );
  const roleNameById = useMemo(
    () => new Map(roleOptions.map((option) => [option.value, option.label])),
    [roleOptions],
  );
  const pendingRows = useMemo(
    () =>
      (pendingQuery.data ?? []).map((row) => ({
        ...row,
        roles: row.roleIds.map((roleId) => ({ id: roleId, name: roleNameById.get(roleId) ?? roleId })),
      })),
    [pendingQuery.data, roleNameById],
  );

  const applyStatus = useCallback(
    (id: string, status: AdminUserStatus, successMsg: string) => {
      mutateStatus(
        { id, status },
        { onSuccess: () => toast.success(successMsg), onError: () => toast.error(t("changeFailed")) },
      );
    },
    [mutateStatus, t],
  );

  const confirmRevoke = async () => {
    if (!revoking?.invitationId) return;
    const target = revoking;
    try {
      await mutateRevokeAsync(target.invitationId as string);
      toast.success(t("revokedToast", { name: target.name }));
      setRevoking(null);
    } catch {
      toast.error(t("changeFailed"));
    }
  };
  const resendInvite = useCallback(
    async (user: AdminUserRow) => {
      if (!user.invitationId) return;
      try {
        await mutateResendAsync(user.invitationId);
        toast.success(t("resentToast", { name: user.name }));
      } catch (error) {
        toast.error(apiErrorMessage(error, ta));
      }
    },
    [mutateResendAsync, t, ta],
  );
  const confirmDeactivate = async () => {
    if (!deactivating || confirmText !== CONFIRM_WORD) return;
    const target = deactivating;
    try {
      await mutateStatusAsync({ id: target.id, status: "deactivated" });
      toast.success(t("deactivatedToast", { name: target.name }));
      setDeactivating(null);
      setConfirmText("");
    } catch {
      toast.error(t("changeFailed"));
    }
  };

  type RowAction = {
    key: string;
    label: string;
    onSelect: () => void;
    variant?: "default" | "destructive";
    disabled?: boolean;
    title?: string;
  };

  const actionsFor = useCallback(
    (user: AdminUserRow): RowAction[] => {
      if (!canManage) return [];
      const selfBlock = user.email.toLowerCase() === selfEmail ? t("selfBlock") : undefined;
      const suspendItem: RowAction = {
        key: "suspend",
        label: t("actionSuspend"),
        onSelect: () => applyStatus(user.id, "suspended", t("suspendedToast", { name: user.name })),
        disabled: Boolean(selfBlock),
        title: selfBlock,
      };
      const deactivateItem: RowAction = {
        key: "deactivate",
        label: t("actionDeactivate"),
        variant: "destructive",
        onSelect: () => {
          setConfirmText("");
          setDeactivating(user);
        },
        disabled: Boolean(selfBlock),
        title: selfBlock,
      };
      const reactivateItem: RowAction = {
        key: "reactivate",
        label: t("actionReactivate"),
        onSelect: () => applyStatus(user.id, "active", t("reactivatedToast", { name: user.name })),
        disabled: Boolean(selfBlock),
        title: selfBlock,
      };
      switch (user.effectiveStatus) {
        case "expired":
        case "pending": {
          const cooldownActive = user.invitableAgainAt != null && user.invitableAgainAt > now;
          return [
            {
              key: "resend",
              label: t("actionResend"),
              onSelect: () => resendInvite(user),
              disabled: !user.invitationId || cooldownActive,
              title: !user.invitationId
                ? t("inviteLoading")
                : cooldownActive
                  ? t("resendCooldown", { time: fmtRelative(user.invitableAgainAt as number, locale) })
                  : undefined,
            },
            {
              key: "revoke",
              label: t("actionRevoke"),
              variant: "destructive",
              onSelect: () => setRevoking(user),
              disabled: !user.invitationId,
              title: user.invitationId ? undefined : t("inviteLoading"),
            },
          ];
        }
        case "active":
          return [suspendItem, deactivateItem];
        case "suspended":
          return [reactivateItem, deactivateItem];
        default:
          return [];
      }
    },
    [t, canManage, selfEmail, applyStatus, resendInvite, now, locale],
  );

  const { accountsColumns, invitationColumns } = useMemo(() => {
    const nameCol: ColumnDef<AdminUserRow, unknown> = {
      id: "name",
      accessorFn: (user) => user.name,
      size: 220,
      header: t("colName"),
      enableSorting: false,
      cell: ({ row }) => <ProfileCell name={row.original.name} initials={row.original.initials} />,
    };
    const emailCol: ColumnDef<AdminUserRow, unknown> = {
      id: "email",
      accessorFn: (user) => user.email,
      size: 230,
      header: t("colEmail"),
      enableSorting: false,
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.email}</span>,
    };
    const rolesCol: ColumnDef<AdminUserRow, unknown> = {
      id: "roles",
      accessorFn: (user) => (user.roles ?? []).map((role) => role.name).join(" "),
      size: 260,
      header: t("colRoles"),
      enableSorting: false,
      meta: { filter: "select", filterOptions: roleOptions, filterLabel: t("colRoles") },
      cell: ({ row }) => {
        const roles = row.original.roles ?? [];
        const shown = roles.slice(0, 3);
        const extra = roles.length - shown.length;
        if (roles.length === 0) return <span className="text-muted-foreground">-</span>;
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            {shown.map((role) => (
              <Chip key={role.id}>{role.name}</Chip>
            ))}
            {extra > 0 && <Chip variant="soft">{t("moreRoles", { count: extra })}</Chip>}
          </div>
        );
      },
    };
    const statusCol: ColumnDef<AdminUserRow, unknown> = {
      id: "status",
      accessorFn: (user) => user.effectiveStatus,
      size: 140,
      header: t("colStatus"),
      enableSorting: false,
      meta: {
        filter: "select",
        filterOptions: STATUS_FILTER.map((status) => ({
          value: status.toUpperCase(),
          label: t(`status_${status}`),
        })),
        filterLabel: t("colStatus"),
      },
      cell: ({ row }) => (
        <StatusBadge
          tone={STATUS_TONE[row.original.effectiveStatus]}
          equalWidth={false}
          className="min-w-[7rem]"
        >
          {t(`status_${row.original.effectiveStatus}`)}
        </StatusBadge>
      ),
    };
    const lastLoginCol: ColumnDef<AdminUserRow, unknown> = {
      id: "lastLogin",
      accessorFn: (user) => user.lastLogin ?? 0,
      size: 150,
      header: t("colLastLogin"),
      meta: { filter: "dateRange", filterLabel: t("colLastLogin") },
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.lastLogin == null ? t("never") : fmtRelative(row.original.lastLogin, locale)}
        </span>
      ),
    };
    const createdCol: ColumnDef<AdminUserRow, unknown> = {
      id: "created",
      accessorFn: (user) => user.invitedAt ?? 0,
      size: 140,
      header: t("colCreated"),
      meta: { filter: "dateRange", filterLabel: t("colCreated") },
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground tabular">
          {row.original.invitedAt ? fmtDateTimeParts(row.original.invitedAt, locale).date : "-"}
        </span>
      ),
    };
    const invitedByCol: ColumnDef<AdminUserRow, unknown> = {
      id: "invitedBy",
      accessorFn: (user) => user.invitedByName ?? "",
      size: 220,
      header: t("colInvitedBy"),
      enableSorting: false,
      cell: ({ row }) =>
        row.original.invitedByName ? (
          <ProfileCell
            name={row.original.invitedByName}
            subtitle={row.original.invitedByEmail ?? undefined}
          />
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    };
    const lastSentCol: ColumnDef<AdminUserRow, unknown> = {
      id: "lastSent",
      accessorFn: (user) => user.lastInviteSentAt ?? 0,
      size: 150,
      header: t("colLastSent"),
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground tabular">
          {row.original.lastInviteSentAt
            ? fmtDateTimeParts(row.original.lastInviteSentAt, locale).date
            : "-"}
        </span>
      ),
    };
    const actionsCol: ColumnDef<AdminUserRow, unknown> = {
      id: "actions",
      enableSorting: false,
      size: 80,
      header: "",
      meta: { headClassName: "text-end", cellClassName: "text-end", noClip: true },
      cell: ({ row }) => {
        const items = actionsFor(row.original);
        const stop = (event: SyntheticEvent) => event.stopPropagation();
        if (items.length === 0) {
          return (
            <div className="flex justify-end" onClick={stop} onKeyDown={stop}>
              <Tooltip>
                <TooltipTrigger
                  render={<Button size="icon-sm" variant="ghost" disabled aria-label={t("noActions")} />}
                >
                  <MoreHorizontal className="size-4" />
                </TooltipTrigger>
                <TooltipContent>{t("noActions")}</TooltipContent>
              </Tooltip>
            </div>
          );
        }
        return (
          <div className="flex justify-end" onClick={stop} onKeyDown={stop}>
            <Menu>
              <MenuTrigger render={<Button size="icon-sm" variant="ghost" aria-label={t("rowActions")} />}>
                <MoreHorizontal className="size-4" />
              </MenuTrigger>
              <MenuContent>
                {items.map((item) =>
                  item.title ? (
                    <Tooltip key={item.key}>
                      <TooltipTrigger
                        render={
                          <MenuItem variant={item.variant} disabled={item.disabled} onClick={item.onSelect} />
                        }
                      >
                        {item.label}
                      </TooltipTrigger>
                      <TooltipContent>{item.title}</TooltipContent>
                    </Tooltip>
                  ) : (
                    <MenuItem
                      key={item.key}
                      variant={item.variant}
                      disabled={item.disabled}
                      onClick={item.onSelect}
                    >
                      {item.label}
                    </MenuItem>
                  ),
                )}
              </MenuContent>
            </Menu>
          </div>
        );
      },
    };
    return {
      accountsColumns: [nameCol, emailCol, rolesCol, statusCol, lastLoginCol, createdCol, actionsCol],
      invitationColumns: [nameCol, emailCol, rolesCol, statusCol, invitedByCol, lastSentCol, actionsCol],
    };
  }, [t, locale, roleOptions, actionsFor]);

  return (
    <div className="mx-auto max-w-7xl">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="accounts" className="gap-4">
            <TabsList>
              <TabsTrigger value="accounts">{t("tabAccounts")}</TabsTrigger>
              <TabsTrigger value="pending">
                {t("tabPending", { count: pendingRows.length })}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="accounts">
              {error ? (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <p className="text-sm text-muted-foreground">{t("loadError")}</p>
                  <Button variant="outline" size="sm" onClick={() => usersQuery.refetch()}>
                    {tc("retry")}
                  </Button>
                </div>
              ) : loading ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <Skeleton key={index} className="h-11 w-full" />
                  ))}
                </div>
              ) : (
                <DataTable
                  columns={accountsColumns}
                  data={rows}
                  pageSize={25}
                  manualServer
                  rowCount={total}
                  onServerStateChange={onServerStateChange}
                  searchPlaceholder={t("search")}
                  emptyLabel={t("empty")}
                  itemsLabel={t("items")}
                  onRowClick={(user) => openAt(rows.indexOf(user))}
                  rowAriaLabel={(user) => user.name}
                  rowClassName={(user) => (active && user.id === active.id ? "bg-accent" : undefined)}
                  getSearchText={(user) => `${user.name} ${user.email}`}
                  filterLabels={{
                    filter: tc("filter"),
                    clear: tc("clear"),
                    clearFilters: tc("clearFilters"),
                    search: t("filterSearch"),
                    from: tc("from"),
                    to: tc("to"),
                  }}
                  enableFreeze
                  maxFreeze={2}
                  toolbar={
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            size="lg"
                            onClick={() => setInviteOpen(true)}
                            disabled={!canManage}
                            aria-label={t("inviteAdmin")}
                            className={toolbarIconButtonClass}
                          />
                        }
                      >
                        <Plus className="size-4" />
                        <span className="hidden sm:inline">{t("inviteAdmin")}</span>
                      </TooltipTrigger>
                      <TooltipContent>{canManage ? t("inviteAdmin") : t("noPermission")}</TooltipContent>
                    </Tooltip>
                  }
                />
              )}
            </TabsContent>

            <TabsContent value="pending">
              {pendingQuery.isError ? (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <p className="text-sm text-muted-foreground">{t("pendingLoadError")}</p>
                  <Button variant="outline" size="sm" onClick={() => pendingQuery.refetch()}>
                    {tc("retry")}
                  </Button>
                </div>
              ) : pendingQuery.isPending ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-11 w-full" />
                  ))}
                </div>
              ) : (
                <DataTable
                  columns={invitationColumns}
                  data={pendingRows}
                  pageSize={10}
                  searchPlaceholder={t("search")}
                  emptyLabel={t("pendingEmpty")}
                  itemsLabel={t("items")}
                  onRowClick={(invite) => setSelectedInvite(invite)}
                  rowAriaLabel={(invite) => invite.name}
                  rowClassName={(invite) =>
                    selectedInvite && invite.id === selectedInvite.id ? "bg-accent" : undefined
                  }
                  getSearchText={(user) => `${user.name} ${user.email}`}
                  filterLabels={{
                    filter: tc("filter"),
                    clear: tc("clear"),
                    clearFilters: tc("clearFilters"),
                    search: t("filterSearch"),
                    from: tc("from"),
                    to: tc("to"),
                  }}
                  enableFreeze
                  maxFreeze={2}
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <InviteAdminDialog open={inviteOpen} onOpenChange={setInviteOpen} />

      <AlertDialog
        open={revoking != null}
        onOpenChange={(open) => !open && !revokePending && setRevoking(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("revokeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {revoking ? t("revokeBody", { name: revoking.name, email: revoking.email }) : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter layout="split">
            <AlertDialogCancel disabled={revokePending}>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRevoke}
              loading={revokePending}
              className="bg-danger text-danger-foreground hover:bg-danger/90"
            >
              {t("revokeConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deactivating != null}
        onOpenChange={(open) => {
          if (!open && !statusPending) {
            setDeactivating(null);
            setConfirmText("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deactivateTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deactivating ? t("deactivateBody", { name: deactivating.name }) : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Field label={t("deactivateConfirmLabel", { word: CONFIRM_WORD })} htmlFor="deactivate-confirm">
            <Input
              id="deactivate-confirm"
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              placeholder={CONFIRM_WORD}
              autoComplete="off"
            />
          </Field>
          <AlertDialogFooter layout="split">
            <AlertDialogCancel disabled={statusPending}>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeactivate}
              disabled={confirmText !== CONFIRM_WORD}
              loading={statusPending}
              className="bg-danger text-danger-foreground hover:bg-danger/90"
            >
              {t("deactivateConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              <div className="flex items-center gap-3">
                <ProfileCell name={selected.name} initials={selected.initials} subtitle={selected.email} />
              </div>
              <SheetTitle className="sr-only">{selected.name}</SheetTitle>
              <SheetDescription className="sr-only">{selected.email}</SheetDescription>
              <div className="pt-1">
                <StatusBadge tone={STATUS_TONE[selected.effectiveStatus]} equalWidth={false}>
                  {t(`status_${selected.effectiveStatus}`)}
                </StatusBadge>
              </div>
            </SheetHeader>
            <SheetBody ref={detailRef} className="flex flex-col gap-5">
              {detailLoading ? (
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-24 w-full" />
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
                  {detail.staffTerminated && (
                    <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground">
                      {t("terminatedBanner")}
                    </div>
                  )}

                  <section className="flex flex-col gap-2">
                    <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      {t("sectionRoles")}
                    </h4>
                    {(detail.roles ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t("noRoles")}</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {(detail.roles ?? []).map((role) => (
                          <Link key={role.id} href={`/admin/roles/${role.id}`}>
                            <Chip className="hover:border-primary hover:text-primary">{role.name}</Chip>
                          </Link>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="flex flex-col gap-2">
                    <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      {t("sectionSecurity")}
                    </h4>
                    <DetailList
                      items={[
                        {
                          label: t("lastLoginLabel"),
                          value: detail.lastLogin == null ? t("never") : fmtDateTime(detail.lastLogin, locale),
                        },
                      ]}
                    />
                  </section>

                  <section className="flex flex-col gap-2">
                    <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      {t("sectionDevices")}
                    </h4>
                    {devicesQuery.isPending ? (
                      <div className="flex flex-col gap-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : devicesQuery.isError &&
                      (devicesQuery.error as ApiError)?.status === 404 ? (
                      <p className="text-sm text-muted-foreground">{t("devicesUnavailable")}</p>
                    ) : devicesQuery.isError ? (
                      <div className="flex flex-col items-center gap-3 py-6 text-center">
                        <p className="text-sm text-muted-foreground">{t("devicesLoadError")}</p>
                        <Button variant="outline" size="sm" onClick={() => devicesQuery.refetch()}>
                          {tc("retry")}
                        </Button>
                      </div>
                    ) : (devicesQuery.data ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t("noDevices")}</p>
                    ) : (
                      <ul className="flex flex-col gap-2">
                        {(devicesQuery.data ?? []).map((device) => (
                          <li
                            key={device.id}
                            className="flex flex-col gap-0.5 rounded-lg border bg-muted/30 p-3"
                          >
                            <span className="text-sm font-medium">
                              {device.device_name || t("unknownDevice")}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {device.last_used_at
                                ? t("deviceLastUsed", {
                                    time: fmtRelative(Date.parse(device.last_used_at), locale),
                                  })
                                : t("deviceNeverUsed")}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section className="flex flex-col gap-2">
                    <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      {t("sectionTimeline")}
                    </h4>
                    <DetailList
                      items={[
                        { label: t("invitedByLabel"), value: detail.invitedBy || "-" },
                        { label: t("createdAtLabel"), value: fmtDateTime(detail.invitedAt, locale) },
                        {
                          label: t("activatedAtLabel"),
                          value: detail.activatedAt != null ? fmtDateTime(detail.activatedAt, locale) : "-",
                        },
                        { label: t("preferredLanguageLabel"), value: languageLabel(detail.preferredLanguage) },
                      ]}
                    />
                  </section>

                  <section className="flex flex-col gap-2">
                    <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      {t("sectionStaff")}
                    </h4>
                    <DetailList
                      items={[
                        { label: t("staffNameLabel"), value: detail.name },
                        { label: t("staffEmailLabel"), value: detail.email },
                      ]}
                    />
                  </section>
                </>
              )}
            </SheetBody>
            {(() => {
              const items = actionsFor(selected);
              if (items.length === 0) return null;
              return (
                <SheetFooter layout="split">
                  {items.map((item) => (
                    <Button
                      key={item.key}
                      variant={item.variant === "destructive" ? "outline" : "default"}
                      disabled={item.disabled}
                      onClick={item.onSelect}
                      className={
                        item.variant === "destructive"
                          ? "text-danger hover:bg-danger-muted hover:text-danger"
                          : undefined
                      }
                    >
                      {item.label}
                    </Button>
                  ))}
                </SheetFooter>
              );
            })()}
          </SheetContent>
        )}
      </Sheet>

      <Sheet open={selectedInvite != null} onOpenChange={(open) => !open && setSelectedInvite(null)}>
        {shownInvite &&
          (() => {
            const record = inviteDetail ?? shownInvite;
            const cooldownActive = record.invitableAgainAt != null && record.invitableAgainAt > now;
            const inviteRoles = (record.roleIds ?? []).map((roleId) => ({
              id: roleId,
              name: roleNameById.get(roleId) ?? roleId,
            }));
            return (
              <SheetContent>
                <SheetHeader>
                  <div className="flex items-center gap-3">
                    <ProfileCell
                      name={shownInvite.name}
                      initials={shownInvite.initials}
                      subtitle={shownInvite.email}
                    />
                  </div>
                  <SheetTitle className="sr-only">{shownInvite.name}</SheetTitle>
                  <SheetDescription className="sr-only">{shownInvite.email}</SheetDescription>
                  <div className="pt-1">
                    <StatusBadge tone={STATUS_TONE[shownInvite.status]} equalWidth={false}>
                      {t(`status_${shownInvite.status}`)}
                    </StatusBadge>
                  </div>
                </SheetHeader>
                <SheetBody className="flex flex-col gap-5">
                  {inviteError ? (
                    <div className="flex flex-col items-center gap-3 py-16 text-center">
                      <p className="text-sm text-muted-foreground">{t("invitationLoadError")}</p>
                      <Button variant="outline" size="sm" onClick={inviteReload}>
                        {tc("retry")}
                      </Button>
                    </div>
                  ) : inviteLoading ? (
                    <div className="flex flex-col gap-3">
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-24 w-full" />
                    </div>
                  ) : (
                    <>
                      <section className="flex flex-col gap-2">
                        <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                          {t("colRoles")}
                        </h4>
                        {inviteRoles.length === 0 ? (
                          <p className="text-sm text-muted-foreground">-</p>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {inviteRoles.map((role) => (
                              <Chip key={role.id}>{role.name}</Chip>
                            ))}
                          </div>
                        )}
                      </section>

                      <section className="flex flex-col gap-2">
                        <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                          {t("invitedByLabel")}
                        </h4>
                        {record.invitedByName ? (
                          <ProfileCell
                            name={record.invitedByName}
                            subtitle={record.invitedByEmail ?? undefined}
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground">-</p>
                        )}
                      </section>

                      <section className="flex flex-col gap-2">
                        <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                          {t("sectionTimeline")}
                        </h4>
                        <DetailList
                          items={[
                            { label: t("staffEmailLabel"), value: record.email },
                            { label: t("createdAtLabel"), value: fmtDateTime(record.invitedAt, locale) },
                            {
                              label: t("lastSentLabel"),
                              value:
                                record.lastInviteSentAt != null
                                  ? fmtDateTime(record.lastInviteSentAt, locale)
                                  : "-",
                            },
                            {
                              label: t("invitationExpiresLabel"),
                              value:
                                record.invitationExpiresAt != null
                                  ? fmtDateTime(record.invitationExpiresAt, locale)
                                  : "-",
                            },
                            {
                              label: t("invitableAgainLabel"),
                              value:
                                record.invitableAgainAt != null
                                  ? fmtDateTime(record.invitableAgainAt, locale)
                                  : t("resendAvailableNow"),
                            },
                          ]}
                        />
                      </section>
                    </>
                  )}
                </SheetBody>
                {canManage && (
                  <SheetFooter layout="split">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const target = record;
                        setSelectedInvite(null);
                        setRevoking(target);
                      }}
                      className="text-danger hover:bg-danger-muted hover:text-danger"
                    >
                      {t("actionRevoke")}
                    </Button>
                    <Button
                      onClick={() => resendInvite(record)}
                      loading={resendPending}
                      disabled={inviteLoading || !record.invitationId || cooldownActive}
                    >
                      {t("actionResend")}
                    </Button>
                  </SheetFooter>
                )}
              </SheetContent>
            );
          })()}
      </Sheet>
    </div>
  );
}
