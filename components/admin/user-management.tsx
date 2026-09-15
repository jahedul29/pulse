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
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DataTable, toolbarIconButtonClass, type ServerTableState } from "@/components/common/data-table";
import { ProfileCell } from "@/components/common/profile-cell";
import { Chip } from "@/components/common/chip";
import { StatusBadge, type Tone } from "@/components/common/status-badge";
import { DetailList } from "@/components/common/detail-list";
import { Field } from "@/components/ui/field";
import { InviteAdminDialog } from "@/components/admin/invite-admin-dialog";
import { fmtRelative, fmtDateTime } from "@/lib/format";
import { useLanguageLabel } from "@/lib/i18n/language";
import { stepIndex } from "@/lib/paging";
import { useRecordDetail } from "@/lib/use-record-detail";
import { useAuthStore } from "@/lib/auth/store";
import {
  useAdminUsers,
  usePendingInvitationMap,
  useRevokeInvitation,
  useUpdateUserStatus,
} from "@/lib/user-management/queries";
import { fetchAdminUserDetail } from "@/lib/user-management/users-api";
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
  locked: "danger",
};

const STATUS_FILTER: AdminUserStatus[] = ["pending", "active", "suspended", "deactivated"];

export function UserManagement() {
  const t = useTranslations("userManagement");
  const tc = useTranslations("common");
  const languageLabel = useLanguageLabel();
  const locale = useLocale();

  const selfEmail = useAuthStore((state) => state.session?.email?.toLowerCase() ?? "");
  const canManage = useHasPermission(PERMISSIONS.USER_MANAGEMENT_EDIT);

  const [server, setServer] = useState<ServerTableState | null>(null);
  const params = useMemo(() => serverStateToParams(server), [server]);
  const usersQuery = useAdminUsers(params);
  const invitationMap = usePendingInvitationMap();
  const rows = useMemo(() => {
    const map = invitationMap.data ?? {};
    return (usersQuery.data?.data ?? []).map((row) =>
      row.status === "pending" && map[row.staffId] ? { ...row, invitationId: map[row.staffId] } : row,
    );
  }, [usersQuery.data, invitationMap.data]);
  const total = usersQuery.data?.meta?.total ?? rows.length;
  const loading = usersQuery.isPending;
  const error = usersQuery.isError;
  const onServerStateChange = useCallback((state: ServerTableState) => setServer(state), []);

  const { mutate: mutateStatus, mutateAsync: mutateStatusAsync, isPending: statusPending } =
    useUpdateUserStatus();
  const { mutateAsync: mutateRevokeAsync, isPending: revokePending } = useRevokeInvitation();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [revoking, setRevoking] = useState<AdminUserRow | null>(null);
  const [deactivating, setDeactivating] = useState<AdminUserRow | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const active = selectedIndex == null ? null : (rows[selectedIndex] ?? null);
  const [retained, setRetained] = useState<AdminUserRow | null>(null);
  const selected = active ?? retained;
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
        case "pending":
          return [
            {
              key: "resend",
              label: t("actionResend"),
              onSelect: () => undefined,
              disabled: true,
              title: t("resendPendingBackend"),
            },
            {
              key: "revoke",
              label: t("actionRevoke"),
              variant: "destructive",
              onSelect: () => setRevoking(user),
              disabled: !user.invitationId,
              title: user.invitationId ? undefined : t("resendPendingBackend"),
            },
          ];
        case "active":
          return [suspendItem, deactivateItem];
        case "suspended":
          return [reactivateItem, deactivateItem];
        default:
          return [];
      }
    },
    [t, canManage, selfEmail, applyStatus],
  );

  const columns = useMemo<ColumnDef<AdminUserRow, unknown>[]>(
    () => [
      {
        id: "name",
        accessorFn: (user) => user.name,
        size: 220,
        header: t("colName"),
        enableSorting: false,
        cell: ({ row }) => <ProfileCell name={row.original.name} initials={row.original.initials} />,
      },
      {
        id: "email",
        accessorFn: (user) => user.email,
        size: 230,
        header: t("colEmail"),
        enableSorting: false,
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.email}</span>,
      },
      {
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
      },
      {
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
      },
      {
        id: "lastLogin",
        accessorFn: (user) => user.lastLogin ?? 0,
        size: 150,
        header: t("colLastLogin"),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.lastLogin == null ? t("never") : fmtRelative(row.original.lastLogin, locale)}
          </span>
        ),
      },
      {
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
                <MenuTrigger
                  render={<Button size="icon-sm" variant="ghost" aria-label={t("rowActions")} />}
                >
                  <MoreHorizontal className="size-4" />
                </MenuTrigger>
                <MenuContent>
                  {items.map((item) =>
                    item.title ? (
                      <Tooltip key={item.key}>
                        <TooltipTrigger
                          render={
                            <MenuItem
                              variant={item.variant}
                              disabled={item.disabled}
                              onClick={item.onSelect}
                            />
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
      },
    ],
    [t, locale, roleOptions, actionsFor],
  );

  return (
    <div className="mx-auto max-w-7xl">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
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
              columns={columns}
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
          </SheetContent>
        )}
      </Sheet>
    </div>
  );
}
