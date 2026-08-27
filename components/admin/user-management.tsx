"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type SyntheticEvent } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import {
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Plus,
  Shield,
  ShieldCheck,
} from "lucide-react";
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
import { DataTable, toolbarIconButtonClass } from "@/components/common/data-table";
import { ProfileCell } from "@/components/common/profile-cell";
import { Chip } from "@/components/common/chip";
import { StatusBadge, type Tone } from "@/components/common/status-badge";
import { DetailList } from "@/components/common/detail-list";
import { Field } from "@/components/ui/field";
import { InviteAdminDialog } from "@/components/admin/invite-admin-dialog";
import { fmtRelative, fmtDateTime } from "@/lib/format";
import { stepIndex } from "@/lib/paging";
import { useRecordDetail } from "@/lib/use-record-detail";
import { useUserStore } from "@/lib/user-management/store";
import { useStaffStore } from "@/lib/staff/store";
import { useRbacStore } from "@/lib/rbac/store";
import { useAuthStore } from "@/lib/auth/store";
import { fetchAdminUsers, fetchAdminUser, commitStatusChange } from "@/lib/user-management/api";
import { useHasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import type { AdminUser, AdminUserRow, EffectiveStatus } from "@/lib/user-management/types";

const CONFIRM_WORD = "DEACTIVATE";

const STATUS_TONE: Record<EffectiveStatus, Tone> = {
  pending: "neutral",
  active: "success",
  suspended: "warning",
  deactivated: "danger",
  revoked: "neutral",
  locked: "danger",
};

const STATUS_ORDER: EffectiveStatus[] = [
  "pending",
  "active",
  "suspended",
  "deactivated",
  "revoked",
  "locked",
];

export function UserManagement() {
  const t = useTranslations("userManagement");
  const tc = useTranslations("common");
  const locale = useLocale();

  const usersState = useUserStore((s) => s.users);
  const resend = useUserStore((s) => s.resend);
  const revoke = useUserStore((s) => s.revoke);
  const suspend = useUserStore((s) => s.suspend);
  const reactivate = useUserStore((s) => s.reactivate);
  const deactivate = useUserStore((s) => s.deactivate);
  const unlock = useUserStore((s) => s.unlock);
  const replaceUser = useUserStore((s) => s.replaceUser);
  const rolesState = useRbacStore((s) => s.roles);
  const staff = useStaffStore((s) => s.staff);
  const actorName = useAuthStore((s) => s.session?.name ?? "You");
  const selfEmail = useAuthStore((s) => s.session?.email?.toLowerCase() ?? "");
  const canManage = useHasPermission(PERMISSIONS.USER_MANAGEMENT_EDIT);

  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [revoking, setRevoking] = useState<AdminUserRow | null>(null);
  const [deactivating, setDeactivating] = useState<AdminUserRow | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const active = selectedIndex == null ? null : (rows[selectedIndex] ?? null);
  const [retained, setRetained] = useState<AdminUserRow | null>(null);
  const selected = active ?? retained;
  const detailRef = useRef<HTMLDivElement>(null);
  const { data: detail, loading: detailLoading, error: detailError, reload } = useRecordDetail(
    selected?.id ?? null,
    fetchAdminUser,
  );

  useEffect(() => {
    let alive = true;
    fetchAdminUsers()
      .then((r) => {
        if (!alive) return;
        setRows(r);
        setError(false);
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setError(true);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [usersState]);

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

  const roleName = useMemo(() => {
    const map = new Map(rolesState.map((r) => [r.id, r.name]));
    return (id: string) => map.get(id) ?? id;
  }, [rolesState]);

  const staffById = useMemo(() => new Map(staff.map((s) => [s.id, s])), [staff]);

  const roleOptions = useMemo(
    () => rolesState.map((r) => ({ value: r.id, label: r.name })),
    [rolesState],
  );

  const runStatus = useCallback(
    async (id: string, apply: () => void, successMsg: string) => {
      const snapshot = useUserStore.getState().users.find((u) => u.id === id);
      if (!snapshot) return;
      const restore: AdminUser = { ...snapshot };
      apply();
      try {
        await commitStatusChange(id, selfEmail);
        toast.success(successMsg);
      } catch {
        replaceUser(id, restore);
        toast.error(t("changeFailed"));
      }
    },
    [t, replaceUser, selfEmail],
  );

  const confirmRevoke = () => {
    if (!revoking) return;
    const target = revoking;
    setRevoking(null);
    runStatus(target.id, () => revoke(target.id, actorName), t("revokedToast", { name: target.name }));
  };
  const confirmDeactivate = () => {
    if (!deactivating || confirmText !== CONFIRM_WORD) return;
    const target = deactivating;
    setDeactivating(null);
    setConfirmText("");
    runStatus(target.id, () => deactivate(target.id, actorName), t("deactivatedToast", { name: target.name }));
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
    (u: AdminUserRow): RowAction[] => {
      if (!canManage) return [];
      const selfBlock = u.email.toLowerCase() === selfEmail ? t("selfBlock") : undefined;
      const suspendItem: RowAction = {
        key: "suspend",
        label: t("actionSuspend"),
        onSelect: () => runStatus(u.id, () => suspend(u.id, actorName), t("suspendedToast", { name: u.name })),
        disabled: Boolean(selfBlock),
        title: selfBlock,
      };
      const deactivateItem: RowAction = {
        key: "deactivate",
        label: t("actionDeactivate"),
        variant: "destructive",
        onSelect: () => {
          setConfirmText("");
          setDeactivating(u);
        },
        disabled: Boolean(selfBlock),
        title: selfBlock,
      };
      const reactivateItem: RowAction = {
        key: "reactivate",
        label: t("actionReactivate"),
        onSelect: () =>
          runStatus(u.id, () => reactivate(u.id, actorName), t("reactivatedToast", { name: u.name })),
        disabled: Boolean(selfBlock),
        title: selfBlock,
      };
      switch (u.effectiveStatus) {
        case "pending":
          return [
            {
              key: "resend",
              label: t("actionResend"),
              onSelect: () => {
                resend(u.id);
                toast.success(t("resentToast", { email: u.email }));
              },
              disabled: !u.resendReady,
              title: u.resendReady ? undefined : t("resendWait"),
            },
            { key: "revoke", label: t("actionRevoke"), variant: "destructive", onSelect: () => setRevoking(u) },
          ];
        case "active":
          return [suspendItem, deactivateItem];
        case "suspended":
          return [reactivateItem, deactivateItem];
        case "locked":
          return [
            {
              key: "unlock",
              label: t("actionUnlock"),
              onSelect: () => runStatus(u.id, () => unlock(u.id), t("unlockedToast", { name: u.name })),
            },
            deactivateItem,
          ];
        default:
          return [];
      }
    },
    [t, canManage, selfEmail, actorName, runStatus, suspend, reactivate, unlock, resend],
  );

  const columns = useMemo<ColumnDef<AdminUserRow, unknown>[]>(
    () => [
      {
        id: "name",
        accessorFn: (r) => r.name,
        size: 220,
        header: t("colName"),
        cell: ({ row }) => <ProfileCell name={row.original.name} initials={row.original.initials} />,
      },
      {
        id: "email",
        accessorFn: (r) => r.email,
        size: 230,
        header: t("colEmail"),
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.email}</span>,
      },
      {
        id: "roles",
        accessorFn: (r) => r.roleIds.map(roleName).join(" "),
        size: 230,
        header: t("colRoles"),
        enableSorting: false,
        filterFn: (row, _id, value) =>
          !Array.isArray(value) || value.length === 0 || row.original.roleIds.some((r) => value.includes(r)),
        meta: { filter: "select", filterOptions: roleOptions, filterLabel: t("colRoles") },
        cell: ({ row }) => {
          const ids = row.original.roleIds;
          const shown = ids.slice(0, 3);
          const extra = ids.length - shown.length;
          if (ids.length === 0) return <span className="text-muted-foreground">—</span>;
          return (
            <div className="flex flex-wrap items-center gap-1.5">
              {shown.map((id) => (
                <Chip key={id}>{roleName(id)}</Chip>
              ))}
              {extra > 0 && <Chip variant="soft">{t("moreRoles", { count: extra })}</Chip>}
            </div>
          );
        },
      },
      {
        id: "status",
        accessorFn: (r) => r.effectiveStatus,
        size: 140,
        header: t("colStatus"),
        meta: {
          filter: "select",
          filterOptions: STATUS_ORDER.map((s) => ({ value: s, label: t(`status_${s}`) })),
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
        id: "mfa",
        accessorFn: (r) => (r.mfaEnabled ? 1 : 0),
        size: 90,
        header: t("colMfa"),
        meta: { headClassName: "text-center", cellClassName: "text-center" },
        cell: ({ row }) =>
          row.original.mfaEnabled ? (
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" />}>
                <ShieldCheck className="size-5 fill-success/15 text-success" />
              </TooltipTrigger>
              <TooltipContent>{t("mfaOn")}</TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" />}>
                <Shield className="size-5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>{t("mfaOff")}</TooltipContent>
            </Tooltip>
          ),
      },
      {
        id: "lastLogin",
        accessorFn: (r) => r.lastLogin ?? 0,
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
        meta: { headClassName: "text-end", cellClassName: "text-end" },
        cell: ({ row }) => {
          const items = actionsFor(row.original);
          const stop = (e: SyntheticEvent) => e.stopPropagation();
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
    [t, locale, roleName, roleOptions, actionsFor],
  );

  const linkedStaff = detail ? staffById.get(detail.staffId) : undefined;

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
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={rows}
              pageSize={25}
              searchPlaceholder={t("search")}
              emptyLabel={t("empty")}
              itemsLabel={t("items")}
              onRowClick={(r) => openAt(rows.indexOf(r))}
              rowAriaLabel={(r) => r.name}
              rowClassName={(r) => (active && r.id === active.id ? "bg-accent" : undefined)}
              getSearchText={(r) => `${r.name} ${r.email}`}
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

      <AlertDialog open={revoking != null} onOpenChange={(o) => !o && setRevoking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("revokeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {revoking ? t("revokeBody", { name: revoking.name, email: revoking.email }) : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter layout="split">
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRevoke}
              className="bg-danger text-danger-foreground hover:bg-danger/90"
            >
              {t("revokeConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deactivating != null}
        onOpenChange={(o) => {
          if (!o) {
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
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_WORD}
              autoComplete="off"
            />
          </Field>
          <AlertDialogFooter layout="split">
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeactivate}
              disabled={confirmText !== CONFIRM_WORD}
              className="bg-danger text-danger-foreground hover:bg-danger/90"
            >
              {t("deactivateConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                  {linkedStaff?.terminated && (
                    <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground">
                      {t("terminatedBanner")}
                    </div>
                  )}

                  <section className="flex flex-col gap-2">
                    <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      {t("sectionRoles")}
                    </h4>
                    {detail.roleIds.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t("noRoles")}</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {detail.roleIds.map((id) => (
                          <Link key={id} href={`/admin/roles/${id}`}>
                            <Chip className="hover:border-primary hover:text-primary">
                              {roleName(id)}
                            </Chip>
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
                        { label: t("mfaLabel"), value: detail.mfaEnabled ? t("mfaOn") : t("mfaOff") },
                        { label: t("devicesLabel"), value: String(detail.registeredDevices) },
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
                        { label: t("invitedByLabel"), value: detail.invitedBy },
                        { label: t("invitedAtLabel"), value: fmtDateTime(detail.invitedAt, locale) },
                        ...(detail.activatedAt != null
                          ? [{ label: t("activatedAtLabel"), value: fmtDateTime(detail.activatedAt, locale) }]
                          : []),
                        ...(detail.lastStatusChangeAt != null
                          ? [
                              {
                                label: t("lastChangeLabel"),
                                value: t("lastChangeValue", {
                                  date: fmtDateTime(detail.lastStatusChangeAt, locale),
                                  name: detail.lastStatusChangeBy ?? "—",
                                }),
                              },
                            ]
                          : []),
                      ]}
                    />
                  </section>

                  <section className="flex flex-col gap-2">
                    <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      {t("sectionStaff")}
                    </h4>
                    {linkedStaff ? (
                      <DetailList
                        items={[
                          { label: t("staffNameLabel"), value: linkedStaff.name },
                          { label: t("staffEmailLabel"), value: linkedStaff.email },
                          {
                            label: t("staffTitleLabel"),
                            value: `${linkedStaff.title} · ${linkedStaff.department}`,
                          },
                        ]}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">{t("noStaff")}</p>
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
