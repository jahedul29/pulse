"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type SyntheticEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import { Ban, CirclePause, CirclePlay, Plus, RotateCcw, Send, UserX } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  SheetFooter,
} from "@/components/ui/sheet";
import { useRetained } from "@/lib/use-retained";
import { DataTable, toolbarIconButtonClass, type ServerTableState } from "@/components/common/data-table";
import { RecordDrawerHeader } from "@/components/common/record-drawer-header";
import { DateTimeValue } from "@/components/common/date-time-value";
import { DetailSection } from "@/components/common/detail-section";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ProfileCell } from "@/components/common/profile-cell";
import { Chip } from "@/components/common/chip";
import { ChipLink } from "@/components/common/record-link";
import { AdminIdLink } from "@/components/admin/record-refs";
import { UserAccessEditor } from "@/components/admin/user-access-editor";
import { TargetHistory } from "@/components/admin/target-history";
import type { StaffRecord } from "@/lib/staff/types";
import { recordHref, userAccessHref } from "@/lib/record-links";
import { holdsSuperadmin } from "@/lib/rbac/superadmin";
import { useSuperadminGuard } from "@/lib/rbac/use-superadmin-guard";
import { useNow } from "@/lib/use-now";
import { StatusBadge, type Tone } from "@/components/common/status-badge";
import { DetailList } from "@/components/common/detail-list";
import { Field } from "@/components/ui/field";
import { InviteAdminDialog } from "@/components/admin/invite-admin-dialog";
import { fmtRelative, fmtDateTimeParts } from "@/lib/format";
import { useLanguageLabel } from "@/lib/i18n/language";
import { useOrderedRows, useRecordPager } from "@/lib/use-record-pager";
import { useRecordDetail } from "@/lib/use-record-detail";
import { useAuthStore } from "@/lib/auth/store";
import {
  adminUsersQuery,
  useAdminUsers,
  usePendingInvitations,
  useRevokedInvitations,
  useResendInvitation,
  useRevokeInvitation,
  useUpdateUserStatus,
  useUserDevices,
} from "@/lib/user-management/queries";
import { apiErrorMessage } from "@/lib/api/error-message";
import { ApiError } from "@/lib/api/errors";
import { fetchAdminUserDetail, fetchInvitableStaff, fetchInvitation } from "@/lib/user-management/users-api";
import { queryKeys } from "@/lib/api/query-keys";
import { useQueryClient } from "@tanstack/react-query";
import { serverStateToParams } from "@/lib/user-management/list-params";
import { userDetailToDetail } from "@/lib/user-management/dto";
import { useRoles } from "@/lib/rbac/queries";
import { useHasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import type { AdminUserRow, AdminUserStatus, EffectiveStatus } from "@/lib/user-management/types";
import { LoadError } from "@/components/common/load-error";
import { isForbidden } from "@/lib/api/errors";
import { PageContainer } from "@/components/common/page-container";
import { columnWidth } from "@/lib/table/column-widths";
import { AdminProfileLink } from "@/components/common/admin-profile-link";
import { useServerPage } from "@/lib/use-server-page";

const CONFIRM_WORD = "DEACTIVATE";
const STATUS_REASON_MAX = 255;

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

function TabLabel({ full, short }: { full: string; short: string }) {
  return (
    <>
      <span aria-hidden className="sm:hidden">
        {short}
      </span>
      <span aria-hidden className="hidden sm:inline">
        {full}
      </span>
    </>
  );
}

const rowKey = (row: AdminUserRow) => row.id;

const INVITE_ONLY_STATUSES = new Set<AdminUserStatus>(["pending", "revoked", "expired"]);

const SUPERADMIN_STATUS_REASON = {
  checking: "superadminChecking",
  unverified: "superadminUnverified",
  last: "lastSuperadminBlock",
} as const;

export function UserManagement() {
  const t = useTranslations("userManagement");
  const tc = useTranslations("common");
  const ta = useTranslations("apiErrors");
  const languageLabel = useLanguageLabel();
  const locale = useLocale();

  const router = useRouter();
  const searchParams = useSearchParams();
  const selfEmail = useAuthStore((state) => state.session?.email?.toLowerCase() ?? "");
  const canManage = useHasPermission(PERMISSIONS.USER_MANAGEMENT_EDIT);
  const canInvite = useHasPermission(PERMISSIONS.INVITATIONS_EDIT);
  const canPickStaff = useHasPermission(PERMISSIONS.STAFF_VIEW);
  const canViewRoles = useHasPermission(PERMISSIONS.ROLES_VIEW);
  const canViewAccounts = useHasPermission(PERMISSIONS.USER_MANAGEMENT_VIEW);
  const canViewInvites = useHasPermission(PERMISSIONS.INVITATIONS_VIEW);

  const [server, setServer] = useState<ServerTableState | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const params = useMemo(() => serverStateToParams(server), [server]);
  const [linkedId, setLinkedId] = useState<string | null>(searchParams.get("open"));
  const usersQuery = useAdminUsers(params, selectedId != null || linkedId != null);
  const rows = useMemo(() => usersQuery.data?.data ?? [], [usersQuery.data]);
  const superadminGuard = useSuperadminGuard(canManage);
  const checkSuperadmin = superadminGuard.check;
  const pendingQuery = usePendingInvitations();
  const revokedQuery = useRevokedInvitations();
  const total = usersQuery.data?.meta?.total ?? rows.length;
  const loading = usersQuery.isPending;
  const error = usersQuery.isError;
  const onServerStateChange = useCallback((state: ServerTableState) => setServer(state), []);

  const now = useNow(30_000);

  const { mutate: mutateStatus, mutateAsync: mutateStatusAsync, isPending: statusPending } =
    useUpdateUserStatus();
  const { mutateAsync: mutateRevokeAsync, isPending: revokePending } = useRevokeInvitation();
  const { mutateAsync: mutateResendAsync, isPending: resendPending } = useResendInvitation();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteSeed, setInviteSeed] = useState<{ key: number; staff: StaffRecord | null; roleIds: string[] }>({
    key: 0,
    staff: null,
    roleIds: [],
  });
  const openInvite = useCallback((staff: StaffRecord | null = null, roleIds: string[] = []) => {
    setInviteSeed((current) => ({ key: current.key + 1, staff, roleIds }));
    setInviteOpen(true);
  }, []);
  const [revoking, setRevoking] = useState<AdminUserRow | null>(null);
  const [suspending, setSuspending] = useState<AdminUserRow | null>(null);
  const [statusReason, setStatusReason] = useState("");
  const [deactivating, setDeactivating] = useState<AdminUserRow | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const linkedOnPage = linkedId != null && rows.some((row) => row.id === linkedId);
  const activeId = selectedId ?? (linkedOnPage ? linkedId : null);
  const active = activeId == null ? null : (rows.find((row) => row.id === activeId) ?? null);
  const [retained, setRetained] = useState<AdminUserRow | null>(null);

  const [selectedInvite, setSelectedInvite] = useState<AdminUserRow | null>(null);
  const [linkedInviteId, setLinkedInviteId] = useState<string | null>(searchParams.get("invite"));
  const [tab, setTab] = useState(linkedInviteId ? "pending" : "accounts");
  const activeTab = !canViewInvites ? "accounts" : !canViewAccounts && tab === "accounts" ? "pending" : tab;
  const loadInvitation = useCallback((id: string) => fetchInvitation(id), []);
  const {
    data: inviteDetail,
    loading: inviteLoading,
    error: inviteError,
    cause: inviteCause,
    reload: inviteReload,
  } = useRecordDetail(canViewInvites ? (selectedInvite?.id ?? linkedInviteId) : null, loadInvitation);
  const linkedInvite =
    linkedInviteId && !selectedInvite && inviteDetail?.id === linkedInviteId ? inviteDetail : null;
  const shownInvite = useRetained(selectedInvite ?? linkedInvite);
  const [linkTabSynced, setLinkTabSynced] = useState(false);
  if (!linkTabSynced && linkedInvite) {
    setLinkTabSynced(true);
    if (linkedInvite.status === "revoked") setTab("revoked");
  }
  const closeInvite = () => {
    setSelectedInvite(null);
    if (!linkedInviteId) return;
    setLinkedInviteId(null);
    router.replace("/admin/user-management");
  };
  const detailRef = useRef<HTMLDivElement>(null);
  const loadDetail = useCallback(
    (id: string) => fetchAdminUserDetail(id).then(userDetailToDetail),
    [],
  );
  const { data: detail, loading: detailLoading, error: detailError, cause: detailCause, reload } = useRecordDetail(
    canViewAccounts ? (active?.id ?? linkedId ?? retained?.id ?? null) : null,
    loadDetail,
  );
  const linkedDetail = linkedId && detail?.id === linkedId ? detail : null;
  const selected = active ?? linkedDetail ?? retained;
  const devicesQuery = useUserDevices(selected?.id ?? null);

  useEffect(() => {
    detailRef.current?.scrollTo({ top: 0 });
  }, [selected?.id]);

  const clearLink = () => {
    if (!linkedId) return;
    setLinkedId(null);
    router.replace("/admin/user-management");
  };
  const openUser = useCallback(
    (user: AdminUserRow) => {
      if (linkedId) {
        setLinkedId(null);
        router.replace("/admin/user-management");
      }
      setSelectedId(user.id);
      setRetained(user);
    },
    [linkedId, router],
  );
  const closeDetail = () => {
    if (selected) setRetained(selected);
    setSelectedId(null);
    clearLink();
  };
  const queryClient = useQueryClient();
  const { controller: accountsTable, page: serverPage } = useServerPage({
    server,
    pageSize: 25,
    total: total,
    data: usersQuery.data,
    failed: usersQuery.isError,
    queryFor: (state) => adminUsersQuery(serverStateToParams(state)),
  });
  const accountsPager = useRecordPager({
    rows,
    getId: (user) => user.id,
    activeId,
    onSelect: openUser,
    page: serverPage,
  });

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
        roles: row.roleIds.flatMap((roleId) => {
          const name = roleNameById.get(roleId);
          return name ? [{ id: roleId, name }] : [];
        }),
      })),
    [pendingQuery.data, roleNameById],
  );
  const [orderedInvites, setOrderedInviteIds] = useOrderedRows(pendingRows, rowKey);
  const revokedRows = useMemo(
    () =>
      (revokedQuery.data ?? []).map((row) => ({
        ...row,
        roles: row.roleIds.flatMap((roleId) => {
          const name = roleNameById.get(roleId);
          return name ? [{ id: roleId, name }] : [];
        }),
      })),
    [revokedQuery.data, roleNameById],
  );
  const [orderedRevoked, setOrderedRevokedIds] = useOrderedRows(revokedRows, rowKey);
  const shownInviteId = (selectedInvite ?? linkedInvite)?.id ?? null;
  const invitesPager = useRecordPager({
    rows: orderedInvites,
    getId: (invite) => invite.id,
    activeId: shownInviteId,
    onSelect: setSelectedInvite,
  });
  const revokedPager = useRecordPager({
    rows: orderedRevoked,
    getId: (invite) => invite.id,
    activeId: shownInviteId,
    onSelect: setSelectedInvite,
  });
  const pendingStaffIds = useMemo(() => new Set(pendingRows.map((invite) => invite.staffId)), [pendingRows]);
  const canOpenInvite = canInvite && canPickStaff;
  const accountStaffIds = useMemo(
    () =>
      new Set(
        (superadminGuard.users ?? [])
          .filter((user) => !INVITE_ONLY_STATUSES.has(user.status))
          .map((user) => user.staffId),
      ),
    [superadminGuard.users],
  );
  const [checkingInviteId, setCheckingInviteId] = useState<string | null>(null);
  const inviteAgainBlock = useCallback(
    (invite: AdminUserRow): string | null => {
      if (!canInvite) return t("noPermission");
      if (!canPickStaff) return tc("noPermission");
      if (pendingQuery.isPending) return t("inviteAgainChecking");
      if (pendingQuery.isError) return t("inviteAgainUnverified");
      if (pendingStaffIds.has(invite.staffId)) return t("inviteAgainPending");
      if (accountStaffIds.has(invite.staffId)) return t("inviteAgainHasAccount");
      if (checkingInviteId === invite.id) return t("inviteAgainChecking");
      return null;
    },
    [canInvite, canPickStaff, pendingQuery.isPending, pendingQuery.isError, pendingStaffIds, accountStaffIds, checkingInviteId, t, tc],
  );
  const inviteAgain = useCallback(
    async (invite: AdminUserRow) => {
      setCheckingInviteId(invite.id);
      try {
        const staff = await queryClient.fetchQuery({
          queryKey: [...queryKeys.unlinkedStaff(), invite.name],
          queryFn: () => fetchInvitableStaff(invite.name),
        });
        const member = staff.find((candidate) => candidate.id === invite.staffId);
        if (member) openInvite(member, invite.roleIds);
        else toast.error(t("inviteAgainIneligible", { name: invite.name }));
      } catch (error) {
        toast.error(apiErrorMessage(error, ta));
      } finally {
        setCheckingInviteId(null);
      }
    },
    [queryClient, openInvite, t, ta],
  );

  const applyStatus = useCallback(
    (id: string, status: AdminUserStatus, successMsg: string) => {
      mutateStatus(
        { id, status },
        {
          onSuccess: () => toast.success(successMsg),
          onError: (error) => toast.error(isForbidden(error) ? ta("forbidden") : t("changeFailed")),
        },
      );
    },
    [mutateStatus, t, ta],
  );

  const confirmRevoke = async () => {
    if (!revoking?.invitationId) return;
    const target = revoking;
    try {
      await mutateRevokeAsync(target.invitationId as string);
      toast.success(t("revokedToast", { name: target.name }));
      setRevoking(null);
    } catch (error) {
      toast.error(isForbidden(error) ? ta("forbidden") : t("changeFailed"));
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
      await mutateStatusAsync({ id: target.id, status: "deactivated", reason: statusReason.trim() || undefined });
      toast.success(t("deactivatedToast", { name: target.name }));
      setDeactivating(null);
      setConfirmText("");
    } catch (error) {
      toast.error(isForbidden(error) ? ta("forbidden") : t("changeFailed"));
    }
  };
  const confirmSuspend = async () => {
    if (!suspending) return;
    const target = suspending;
    try {
      await mutateStatusAsync({ id: target.id, status: "suspended", reason: statusReason.trim() || undefined });
      toast.success(t("suspendedToast", { name: target.name }));
      setSuspending(null);
    } catch (error) {
      toast.error(isForbidden(error) ? ta("forbidden") : t("changeFailed"));
    }
  };

  type RowAction = {
    key: string;
    label: string;
    icon: typeof Send;
    onSelect: () => void;
    variant?: "default" | "destructive";
    disabled?: boolean;
    title?: string;
  };

  const actionsFor = useCallback(
    (user: AdminUserRow): RowAction[] => {
      const superadminCheck = user.status === "active" && holdsSuperadmin(user, now) ? checkSuperadmin(user.id) : null;
      const superadminBlock = superadminCheck ? t(SUPERADMIN_STATUS_REASON[superadminCheck]) : undefined;
      const selfBlock = user.email.toLowerCase() === selfEmail ? t("selfBlock") : undefined;
      const statusBlock = selfBlock ?? superadminBlock;
      const suspendItem: RowAction = {
        key: "suspend",
        label: t("actionSuspend"),
        icon: CirclePause,
        onSelect: () => {
          setStatusReason("");
          setSuspending(user);
        },
        disabled: Boolean(statusBlock),
        title: statusBlock,
      };
      const deactivateItem: RowAction = {
        key: "deactivate",
        label: t("actionDeactivate"),
        icon: UserX,
        variant: "destructive",
        onSelect: () => {
          setConfirmText("");
          setStatusReason("");
          setDeactivating(user);
        },
        disabled: Boolean(statusBlock),
        title: statusBlock,
      };
      const reactivateItem: RowAction = {
        key: "reactivate",
        label: t("actionReactivate"),
        icon: CirclePlay,
        onSelect: () => applyStatus(user.id, "active", t("reactivatedToast", { name: user.name })),
        disabled: Boolean(selfBlock),
        title: selfBlock,
      };
      switch (user.effectiveStatus) {
        case "expired":
        case "pending": {
          if (!canInvite) return [];
          const cooldownActive = user.invitableAgainAt != null && user.invitableAgainAt > now;
          return [
            {
              key: "resend",
              label: t("actionResend"),
              icon: Send,
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
              icon: Ban,
              variant: "destructive",
              onSelect: () => setRevoking(user),
              disabled: !user.invitationId,
              title: user.invitationId ? undefined : t("inviteLoading"),
            },
          ];
        }
        case "active":
          return canManage ? [suspendItem, deactivateItem] : [];
        case "suspended":
          return canManage ? [reactivateItem, deactivateItem] : [];
        default:
          return [];
      }
    },
    [t, canManage, canInvite, selfEmail, checkSuperadmin, applyStatus, resendInvite, now, locale],
  );

  const { accountsColumns, invitationColumns, revokedColumns } = useMemo(() => {
    const nameCol: ColumnDef<AdminUserRow, unknown> = {
      id: "name",
      accessorFn: (user) => user.name,
      ...columnWidth("name"),
      header: t("colName"),
      enableSorting: false,
      cell: ({ row }) => <ProfileCell name={row.original.name} initials={row.original.initials} />,
    };
    const emailCol: ColumnDef<AdminUserRow, unknown> = {
      id: "email",
      accessorFn: (user) => user.email,
      ...columnWidth("email"),
      header: t("colEmail"),
      enableSorting: false,
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.email}</span>,
    };
    const rolesCol: ColumnDef<AdminUserRow, unknown> = {
      id: "roles",
      accessorFn: (user) => (user.roles ?? []).map((role) => role.name).join(" "),
      ...columnWidth("chips"),
      header: t("colRoles"),
      enableSorting: false,
      meta: canViewRoles ? { filter: "select", filterOptions: roleOptions, filterLabel: t("colRoles") } : undefined,
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
      ...columnWidth("name"),
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
      size: 96,
      header: "",
      meta: { headClassName: "text-end", cellClassName: "text-end", noClip: true },
      cell: ({ row }) => {
        const items = actionsFor(row.original);
        const stop = (event: SyntheticEvent) => event.stopPropagation();
        if (items.length === 0) {
          return (
            <div className="flex justify-end pe-2 text-muted-foreground">
              <span aria-hidden>-</span>
              <span className="sr-only">{t("noActions")}</span>
            </div>
          );
        }
        return (
          <div
            role="group"
            aria-label={t("rowActions")}
            className="flex items-center justify-end gap-0.5"
            onClick={stop}
            onKeyDown={stop}
          >
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <Tooltip key={item.key}>
                  <TooltipTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        focusableWhenDisabled
                        disabled={item.disabled}
                        aria-label={item.label}
                        onClick={item.onSelect}
                        className={cn(
                          "size-8 text-muted-foreground hover:text-foreground data-[disabled]:hover:bg-transparent data-[disabled]:hover:text-muted-foreground",
                          item.variant === "destructive" && "hover:bg-danger-muted hover:text-danger",
                        )}
                      />
                    }
                  >
                    <Icon className="size-4" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <span className="flex flex-col gap-0.5">
                      <span>{item.label}</span>
                      {item.title && <span className="text-xs opacity-80">{item.title}</span>}
                    </span>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        );
      },
    };
    const revokedAtCol: ColumnDef<AdminUserRow, unknown> = {
      id: "revokedAt",
      accessorFn: (user) => user.revokedAt ?? 0,
      size: 130,
      header: t("colRevoked"),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground tabular">
          {row.original.revokedAt ? fmtDateTimeParts(row.original.revokedAt, locale).date : "-"}
        </span>
      ),
    };
    const revokedByCol: ColumnDef<AdminUserRow, unknown> = {
      id: "revokedBy",
      accessorFn: (user) => user.revokedByName ?? "",
      ...columnWidth("name"),
      header: t("colRevokedBy"),
      enableSorting: false,
      cell: ({ row }) =>
        row.original.revokedByName ? (
          <ProfileCell name={row.original.revokedByName} subtitle={row.original.revokedByEmail ?? undefined} />
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    };
    const revokedActionsCol: ColumnDef<AdminUserRow, unknown> = {
      id: "actions",
      enableSorting: false,
      size: 64,
      header: "",
      meta: { headClassName: "text-end", cellClassName: "text-end", noClip: true },
      cell: ({ row }) => {
        const blocked = inviteAgainBlock(row.original);
        const stop = (event: SyntheticEvent) => event.stopPropagation();
        return (
          <div className="flex items-center justify-end" onClick={stop} onKeyDown={stop}>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    focusableWhenDisabled
                    disabled={blocked != null}
                    aria-label={t("actionInviteAgain")}
                    onClick={() => inviteAgain(row.original)}
                    className="size-8 text-muted-foreground hover:text-foreground data-[disabled]:hover:bg-transparent data-[disabled]:hover:text-muted-foreground"
                  />
                }
              >
                <RotateCcw className="size-4 rtl:-scale-x-100" />
              </TooltipTrigger>
              <TooltipContent>
                <span className="flex flex-col gap-0.5">
                  <span>{t("actionInviteAgain")}</span>
                  {blocked && <span className="text-xs opacity-80">{blocked}</span>}
                </span>
              </TooltipContent>
            </Tooltip>
          </div>
        );
      },
    };
    return {
      accountsColumns: [nameCol, emailCol, rolesCol, statusCol, lastLoginCol, createdCol, actionsCol],
      invitationColumns: [nameCol, emailCol, rolesCol, statusCol, invitedByCol, lastSentCol, actionsCol],
      revokedColumns: [nameCol, emailCol, rolesCol, revokedAtCol, revokedByCol, revokedActionsCol],
    };
  }, [t, locale, roleOptions, actionsFor, canViewRoles, inviteAgainBlock, inviteAgain]);

  const inviteButton = (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            size="lg"
            onClick={() => openInvite()}
            focusableWhenDisabled
            disabled={!canOpenInvite}
            aria-label={t("inviteAdmin")}
            className={toolbarIconButtonClass}
          />
        }
      >
        <Plus className="size-4" />
        <span className="hidden sm:inline">{t("inviteAdmin")}</span>
      </TooltipTrigger>
      <TooltipContent>
        {canOpenInvite ? t("inviteAdmin") : canInvite ? tc("noPermission") : t("noPermission")}
      </TooltipContent>
    </Tooltip>
  );

  return (
    <PageContainer fill>
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setTab(String(value))} className="gap-4 md:min-h-0 md:flex-1">
            <TabsList className="max-w-full overflow-x-auto">
              {canViewAccounts && (
                <TabsTrigger value="accounts" aria-label={t("tabAccounts")}>
                  <TabLabel full={t("tabAccounts")} short={t("tabAccountsShort")} />
                </TabsTrigger>
              )}
              {canViewInvites && (
                <TabsTrigger value="pending" aria-label={t("tabPending", { count: pendingRows.length })}>
                  <TabLabel
                    full={t("tabPending", { count: pendingRows.length })}
                    short={t("tabPendingShort", { count: pendingRows.length })}
                  />
                </TabsTrigger>
              )}
              {canViewInvites && (
                <TabsTrigger value="revoked" aria-label={t("tabRevoked", { count: revokedRows.length })}>
                  <TabLabel
                    full={t("tabRevoked", { count: revokedRows.length })}
                    short={t("tabRevokedShort", { count: revokedRows.length })}
                  />
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="accounts" className="md:flex md:min-h-0 md:flex-1 md:flex-col">
              {error ? (
                <LoadError error={usersQuery.error} message={t("loadError")} onRetry={() => usersQuery.refetch()} />
              ) : loading ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <Skeleton key={index} className="h-11 w-full" />
                  ))}
                </div>
              ) : (
                <DataTable
                  fill
                  columns={accountsColumns}
                  data={rows}
                  pageSize={25}
                  manualServer
                  rowCount={total}
                  onServerStateChange={onServerStateChange}
                  searchPlaceholder={t("search")}
                  emptyLabel={t("empty")}
                  itemsLabel={t("items")}
                  onRowClick={openUser}
                  rowAriaLabel={(user) => user.name}
                  getRowId={(user) => user.id}
                  activeRowId={activeId}
                  controllerRef={accountsTable}
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
                  toolbar={inviteButton}
                />
              )}
            </TabsContent>

            <TabsContent value="pending" className="md:flex md:min-h-0 md:flex-1 md:flex-col">
              {pendingQuery.isError ? (
                <LoadError error={pendingQuery.error} message={t("pendingLoadError")} onRetry={() => pendingQuery.refetch()} />
              ) : pendingQuery.isPending ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-11 w-full" />
                  ))}
                </div>
              ) : (
                <DataTable
                  fill
                  columns={invitationColumns}
                  toolbar={canViewAccounts ? undefined : inviteButton}
                  data={pendingRows}
                  pageSize={10}
                  searchPlaceholder={t("search")}
                  emptyLabel={t("pendingEmpty")}
                  itemsLabel={t("items")}
                  onRowClick={(invite) => setSelectedInvite(invite)}
                  rowAriaLabel={(invite) => invite.name}
                  getRowId={(invite) => invite.id}
                  activeRowId={shownInviteId}
                  onOrderedIdsChange={setOrderedInviteIds}
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

            <TabsContent value="revoked" className="md:flex md:min-h-0 md:flex-1 md:flex-col">
              {revokedQuery.isError ? (
                <LoadError error={revokedQuery.error} message={t("revokedLoadError")} onRetry={() => revokedQuery.refetch()} />
              ) : revokedQuery.isPending ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-11 w-full" />
                  ))}
                </div>
              ) : (
                <DataTable
                  fill
                  columns={revokedColumns}
                  data={revokedRows}
                  pageSize={10}
                  searchPlaceholder={t("search")}
                  emptyLabel={t("revokedEmpty")}
                  itemsLabel={t("items")}
                  onRowClick={(invite) => setSelectedInvite(invite)}
                  rowAriaLabel={(invite) => invite.name}
                  getRowId={(invite) => invite.id}
                  activeRowId={shownInviteId}
                  onOrderedIdsChange={setOrderedRevokedIds}
                  getSearchText={(user) => `${user.name} ${user.email} ${user.revokedByName ?? ""}`}
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

      <InviteAdminDialog
        key={inviteSeed.key}
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        initialStaff={inviteSeed.staff}
        initialRoleIds={inviteSeed.roleIds}
      />

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
          <Field label={t("deactivateConfirmLabel", { word: CONFIRM_WORD })} required htmlFor="deactivate-confirm">
            <Input
              id="deactivate-confirm"
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              placeholder={CONFIRM_WORD}
              autoComplete="off"
            />
          </Field>
          <Field label={t("statusReasonLabel")} htmlFor="deactivate-reason" reserveMessage={false}>
            <Textarea
              id="deactivate-reason"
              rows={2}
              maxLength={STATUS_REASON_MAX}
              value={statusReason}
              onChange={(event) => setStatusReason(event.target.value)}
              placeholder={t("statusReasonPlaceholder")}
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

      <AlertDialog
        open={suspending != null}
        onOpenChange={(open) => {
          if (!open && !statusPending) setSuspending(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("suspendTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {suspending ? t("suspendBody", { name: suspending.name }) : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Field label={t("statusReasonLabel")} htmlFor="suspend-reason" reserveMessage={false}>
            <Textarea
              id="suspend-reason"
              rows={2}
              maxLength={STATUS_REASON_MAX}
              value={statusReason}
              onChange={(event) => setStatusReason(event.target.value)}
              placeholder={t("statusReasonPlaceholder")}
            />
          </Field>
          <AlertDialogFooter layout="split">
            <AlertDialogCancel disabled={statusPending}>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSuspend} loading={statusPending}>
              {t("suspendConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet inspect open={selectedId != null || linkedId != null} onOpenChange={(open) => !open && closeDetail()}>
        {selected && (
          <SheetContent onSwipeNext={() => accountsPager.step(1)} onSwipePrev={() => accountsPager.step(-1)}>
            <RecordDrawerHeader
              pager={accountsPager}
              link={recordHref("adminAccount", selected.id)}
              title={selected.name}
              subtitle={selected.email}
              summary={[
                {
                  label: t("colLastLogin"),
                  value: selected.lastLogin == null ? t("never") : <DateTimeValue epoch={selected.lastLogin} locale={locale} />,
                },
                {
                  label: t("colStatus"),
                  value: (
                    <StatusBadge tone={STATUS_TONE[selected.effectiveStatus]} equalWidth={false}>
                      {t(`status_${selected.effectiveStatus}`)}
                    </StatusBadge>
                  ),
                },
                {
                  label: t("colCreated"),
                  value: selected.invitedAt ? <DateTimeValue epoch={selected.invitedAt} locale={locale} /> : "-",
                },
              ]}
            />
            <SheetBody ref={detailRef} className="flex flex-col gap-6">
              {detailLoading ? (
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : detailError || !detail ? (
                <LoadError error={detailCause} message={t("loadError")} onRetry={reload} className="py-10" />
              ) : (
                <>
                  {detail.staffTerminated && (
                    <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground">
                      {t("terminatedBanner")}
                    </div>
                  )}

                  <UserAccessEditor
                    userId={detail.id}
                    userName={detail.name}
                    variant="drawer"
                    canEdit={false}
                    manageHref={detail.email.toLowerCase() === selfEmail ? undefined : userAccessHref(detail.id)}
                  />

                  <DetailSection title={t("sectionAccount")}>
                    <DetailList
                      divided
                      items={[
                        { label: t("usernameLabel"), value: detail.username || "-" },
                        { label: t("preferredLanguageLabel"), value: languageLabel(detail.preferredLanguage) },
                        ...(detail.statusReason ? [{ label: t("statusReasonRow"), value: detail.statusReason }] : []),
                      ]}
                    />
                  </DetailSection>

                  <DetailSection
                    title={
                      devicesQuery.data
                        ? t("sectionDevicesCount", { count: devicesQuery.data.length })
                        : t("sectionDevices")
                    }
                  >
                    {devicesQuery.isPending ? (
                      <div className="flex flex-col gap-2">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                      </div>
                    ) : devicesQuery.isError && (devicesQuery.error as ApiError)?.status === 404 ? (
                      <p className="text-sm text-muted-foreground">{t("devicesUnavailable")}</p>
                    ) : devicesQuery.isError ? (
                      <LoadError error={devicesQuery.error} message={t("devicesLoadError")} onRetry={() => devicesQuery.refetch()} className="py-6" />
                    ) : (devicesQuery.data ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t("noDevices")}</p>
                    ) : (
                      <div
                        tabIndex={0}
                        role="region"
                        aria-label={t("sectionDevices")}
                        className="max-h-60 overflow-y-auto rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      >
                        <ul className="divide-y">
                          {(devicesQuery.data ?? []).map((device) => (
                            <li
                              key={device.id}
                              className="flex min-h-9 items-center justify-between gap-3 py-1.5 first:pt-0 last:pb-0"
                            >
                              <span className="min-w-0 truncate text-sm font-medium">
                                {device.device_name || t("unknownDevice")}
                              </span>
                              <span className="shrink-0 text-[13px] text-muted-foreground">
                                {device.last_used_at
                                  ? t("deviceLastUsed", { time: fmtRelative(Date.parse(device.last_used_at), locale) })
                                  : t("deviceNeverUsed")}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </DetailSection>

                  <DetailSection title={t("sectionTimeline")}>
                    <DetailList
                      divided
                      items={[
                        {
                          label: t("invitedByLabel"),
                          value: detail.invitedBy ? <AdminIdLink id={detail.invitedBy} fallback={t("inviterFallback")} /> : "-",
                        },
                        {
                          label: t("activatedAtLabel"),
                          value: detail.activatedAt != null ? <DateTimeValue epoch={detail.activatedAt} locale={locale} /> : "-",
                        },
                      ]}
                    />
                  </DetailSection>
                </>
              )}
            </SheetBody>
            {(() => {
              const items = actionsFor(selected);
              if (items.length === 0) return null;
              return (
                <SheetFooter layout="split">
                  {items.map((item) => {
                    const buttonProps = {
                      size: "lg" as const,
                      variant: item.variant === "destructive" ? ("outline" as const) : ("default" as const),
                      focusableWhenDisabled: true,
                      disabled: item.disabled,
                      onClick: item.onSelect,
                      className:
                        item.variant === "destructive" ? "text-danger hover:bg-danger-muted hover:text-danger" : undefined,
                    };
                    return item.disabled && item.title ? (
                      <Tooltip key={item.key}>
                        <TooltipTrigger render={<Button {...buttonProps} />}>{item.label}</TooltipTrigger>
                        <TooltipContent>{item.title}</TooltipContent>
                      </Tooltip>
                    ) : (
                      <Button key={item.key} {...buttonProps}>
                        {item.label}
                      </Button>
                    );
                  })}
                </SheetFooter>
              );
            })()}
          </SheetContent>
        )}
      </Sheet>

      <Sheet
        inspect
        open={selectedInvite != null || linkedInviteId != null}
        onOpenChange={(open) => !open && closeInvite()}
      >
        {shownInvite &&
          (() => {
            const record = inviteDetail ?? shownInvite;
            const revoked = record.status === "revoked";
            const revokedAt = record.revokedAt ?? null;
            const revokedById = record.revokedBy ?? null;
            const revokedByName = record.revokedByName ?? null;
            const revokedByEmail = record.revokedByEmail ?? null;
            const pager = revoked ? revokedPager : invitesPager;
            const inviteAgainReason = inviteAgainBlock(record);
            const cooldownActive = record.invitableAgainAt != null && record.invitableAgainAt > now;
            const inviteRoles = (record.roleIds ?? []).flatMap((roleId) => {
              const name = roleNameById.get(roleId);
              return name ? [{ id: roleId, name }] : [];
            });
            return (
              <SheetContent onSwipeNext={() => pager.step(1)} onSwipePrev={() => pager.step(-1)}>
                <RecordDrawerHeader
                  pager={pager}
                  link={recordHref("invitation", shownInvite.id)}
                  title={shownInvite.name}
                  subtitle={shownInvite.email}
                  summary={[
                    revoked
                      ? {
                          label: t("colSent"),
                          value: record.invitedAt ? <DateTimeValue epoch={record.invitedAt} locale={locale} /> : "-",
                        }
                      : {
                          label: t("colLastSent"),
                          value:
                            record.lastInviteSentAt != null ? (
                              <DateTimeValue epoch={record.lastInviteSentAt} locale={locale} />
                            ) : (
                              "-"
                            ),
                        },
                    {
                      label: t("colStatus"),
                      value: (
                        <StatusBadge tone={STATUS_TONE[record.status]} equalWidth={false}>
                          {t(`status_${record.status}`)}
                        </StatusBadge>
                      ),
                    },
                    revoked
                      ? {
                          label: t("colRevoked"),
                          value: revokedAt != null ? <DateTimeValue epoch={revokedAt} locale={locale} /> : "-",
                        }
                      : {
                          label: t("invitationExpiresLabel"),
                          value:
                            record.invitationExpiresAt != null ? (
                              <DateTimeValue epoch={record.invitationExpiresAt} locale={locale} />
                            ) : (
                              "-"
                            ),
                        },
                  ]}
                />
                <SheetBody className="flex flex-col gap-6">
                  {inviteError ? (
                    <LoadError error={inviteCause} message={t("invitationLoadError")} onRetry={inviteReload} />
                  ) : inviteLoading ? (
                    <div className="flex flex-col gap-3">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-24 w-full" />
                    </div>
                  ) : (
                    <>
                      <DetailSection title={t("colRoles")}>
                        {inviteRoles.length === 0 ? (
                          <p className="text-sm text-muted-foreground">-</p>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {inviteRoles.map((role) => (
                              <ChipLink key={role.id} href={recordHref("role", role.id)}>
                                {role.name}
                              </ChipLink>
                            ))}
                          </div>
                        )}
                      </DetailSection>

                      <DetailSection title={t("invitedByLabel")}>
                        {record.invitedByName ? (
                          <AdminProfileLink
                            id={record.invitedBy}
                            name={record.invitedByName}
                            subtitle={record.invitedByEmail}
                            label={t("openAccount", { name: record.invitedByName })}
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground">-</p>
                        )}
                      </DetailSection>

                      {revoked && (
                        <DetailSection title={t("colRevokedBy")}>
                          {revokedByName ? (
                            <AdminProfileLink
                              id={revokedById}
                              name={revokedByName}
                              subtitle={revokedByEmail}
                              label={t("openAccount", { name: revokedByName })}
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground">-</p>
                          )}
                        </DetailSection>
                      )}

                      <DetailSection title={t("sectionTimeline")}>
                        <DetailList
                          divided
                          items={
                            revoked
                              ? [
                                  {
                                    label: t("lastSentLabel"),
                                    value:
                                      record.lastInviteSentAt != null ? (
                                        <DateTimeValue epoch={record.lastInviteSentAt} locale={locale} />
                                      ) : (
                                        "-"
                                      ),
                                  },
                                ]
                              : [
                                  {
                                    label: t("createdAtLabel"),
                                    value: record.invitedAt ? <DateTimeValue epoch={record.invitedAt} locale={locale} /> : "-",
                                  },
                                  {
                                    label: t("invitableAgainLabel"),
                                    value:
                                      record.invitableAgainAt != null ? (
                                        <DateTimeValue epoch={record.invitableAgainAt} locale={locale} />
                                      ) : (
                                        t("resendAvailableNow")
                                      ),
                                  },
                                ]
                          }
                        />
                      </DetailSection>

                      <TargetHistory targetId={shownInvite.id} />
                    </>
                  )}
                </SheetBody>
                {canInvite && revoked && (
                  <SheetFooter>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            size="lg"
                            focusableWhenDisabled
                            disabled={inviteAgainReason != null}
                            onClick={() => {
                              const target = record;
                              closeInvite();
                              inviteAgain(target);
                            }}
                          />
                        }
                      >
                        <RotateCcw className="size-4 rtl:-scale-x-100" />
                        {t("actionInviteAgain")}
                      </TooltipTrigger>
                      {inviteAgainReason && <TooltipContent>{inviteAgainReason}</TooltipContent>}
                    </Tooltip>
                  </SheetFooter>
                )}
                {canInvite && !revoked && (
                  <SheetFooter layout="split">
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => {
                        const target = record;
                        closeInvite();
                        setRevoking(target);
                      }}
                      className="text-danger hover:bg-danger-muted hover:text-danger"
                    >
                      {t("actionRevoke")}
                    </Button>
                    <Button
                      size="lg"
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
    </PageContainer>
  );
}
