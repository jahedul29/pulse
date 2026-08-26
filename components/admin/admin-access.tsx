"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { StatusBadge } from "@/components/common/status-badge";
import { ProfileCell } from "@/components/common/profile-cell";
import { cn } from "@/lib/utils";
import { fmtDateTimeParts, startOfTomorrow } from "@/lib/format";
import { useRbacStore } from "@/lib/rbac/store";
import { useAdminStore } from "@/lib/auth/admins";
import { useAuthStore } from "@/lib/auth/store";
import { fetchAdminAccess, effectivePermissions, roleExpiryStatus } from "@/lib/rbac/api";
import {
  grantSchema,
  overlaySchema,
  type GrantForm,
  type OverlayForm,
} from "@/lib/rbac/schemas";
import { MODULE_IDS, countGranted } from "@/lib/rbac/modules";
import type { RoleGrant, PermissionOverlay, ModuleId, PermissionAction } from "@/lib/rbac/types";

const TRIGGER = "w-full justify-between font-normal";

export function AdminAccess() {
  const t = useTranslations("rbac");
  const tc = useTranslations("common");
  const locale = useLocale();

  const admins = useAdminStore((s) => s.admins);
  const roles = useRbacStore((s) => s.roles);
  const grantsState = useRbacStore((s) => s.grants);
  const overlaysState = useRbacStore((s) => s.overlays);
  const addGrant = useRbacStore((s) => s.addGrant);
  const revokeGrant = useRbacStore((s) => s.revokeGrant);
  const addOverlay = useRbacStore((s) => s.addOverlay);
  const removeOverlay = useRbacStore((s) => s.removeOverlay);
  const actorName = useAuthStore((s) => s.session?.name ?? "You");

  const [adminId, setAdminId] = useState("");
  const [access, setAccess] = useState<{
    adminId: string;
    grants: RoleGrant[];
    overlays: PermissionOverlay[];
  } | null>(null);
  const [effective, setEffective] = useState<{
    view: number;
    edit: number;
    expiredGrantCount: number;
  } | null>(null);
  const [error, setError] = useState(false);

  const [addRoleOpen, setAddRoleOpen] = useState(false);
  const [expiryOpen, setExpiryOpen] = useState(false);
  const [addOverlayOpen, setAddOverlayOpen] = useState(false);

  const grantSchemaMemo = useMemo(
    () =>
      grantSchema(
        { roleRequired: t("roleRequired"), duplicateRole: t("duplicateRole") },
        { existingRoleIds: grantsState.filter((g) => g.adminId === adminId).map((g) => g.roleId) },
      ),
    [t, grantsState, adminId],
  );
  const grantForm = useForm<GrantForm>({
    resolver: zodResolver(grantSchemaMemo),
    mode: "onSubmit",
    defaultValues: { roleId: "", expiresAt: null },
  });

  const overlaySchemaMemo = useMemo(
    () =>
      overlaySchema(
        { duplicateOverlay: t("duplicateOverlay") },
        {
          existingKeys: overlaysState
            .filter((o) => o.adminId === adminId)
            .map((o) => `${o.moduleId}:${o.action}`),
        },
      ),
    [t, overlaysState, adminId],
  );
  const overlayForm = useForm<OverlayForm>({
    resolver: zodResolver(overlaySchemaMemo),
    mode: "onSubmit",
    defaultValues: { moduleId: MODULE_IDS[0], action: "view" },
  });

  const [revoking, setRevoking] = useState<RoleGrant | null>(null);
  const [removingOverlay, setRemovingOverlay] = useState<PermissionOverlay | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([fetchAdminAccess(adminId), effectivePermissions(adminId)])
      .then(([res, eff]) => {
        if (!active) return;
        setAccess({ adminId, ...res });
        setEffective({ ...countGranted(eff.permissions), expiredGrantCount: eff.expiredGrantCount });
        setError(false);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [adminId, grantsState, overlaysState]);

  const roleName = useMemo(() => {
    const map = new Map(roles.map((r) => [r.id, r.name]));
    return (id: string) => map.get(id) ?? id;
  }, [roles]);

  const loading = adminId !== "" && access?.adminId !== adminId;
  const selectedAdmin = admins.find((a) => a.id === adminId);

  const expiryBadge = (g: RoleGrant) => {
    const status = roleExpiryStatus(g.expiresAt);
    if (status === "permanent") {
      return (
        <StatusBadge tone="neutral" equalWidth={false}>
          {t("permanent")}
        </StatusBadge>
      );
    }
    if (status === "expired") {
      return (
        <StatusBadge tone="danger" equalWidth={false}>
          {t("expired")}
        </StatusBadge>
      );
    }
    if (status === "soon") {
      return (
        <StatusBadge tone="warning" equalWidth={false}>
          {t("expiringSoon")}
        </StatusBadge>
      );
    }
    return (
      <StatusBadge tone="neutral" equalWidth={false}>
        {t("expiresOn", { date: fmtDateTimeParts(g.expiresAt as number, locale).date })}
      </StatusBadge>
    );
  };

  const openAddRole = () => {
    grantForm.reset({ roleId: "", expiresAt: null });
    setAddRoleOpen(true);
  };

  const onGrant = (values: GrantForm) => {
    addGrant({ adminId, roleId: values.roleId, expiresAt: values.expiresAt, by: actorName });
    toast.success(t("grantedToast", { role: roleName(values.roleId) }));
    setAddRoleOpen(false);
  };

  const openAddOverlay = () => {
    overlayForm.reset({ moduleId: MODULE_IDS[0], action: "view" });
    setAddOverlayOpen(true);
  };

  const onAddOverlay = (values: OverlayForm) => {
    addOverlay({ adminId, moduleId: values.moduleId, action: values.action, by: actorName });
    toast.success(t("overlayAddedToast"));
    setAddOverlayOpen(false);
  };

  const confirmRevoke = () => {
    if (!revoking) return;
    revokeGrant(revoking.id);
    toast.success(t("revokedToast"));
    setRevoking(null);
  };

  const confirmRemoveOverlay = () => {
    if (!removingOverlay) return;
    removeOverlay(removingOverlay.id);
    toast.success(t("overlayRemovedToast"));
    setRemovingOverlay(null);
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{t("accessTitle")}</h1>
        <p className="text-sm text-muted-foreground text-pretty">{t("accessSubtitle")}</p>
      </header>

      <Card>
        <CardContent>
          <Field label={t("selectAdmin")} reserveMessage={false}>
            <Select value={adminId} onValueChange={(v) => setAdminId(v ?? "")}>
              <SelectTrigger className="w-full sm:w-80">
                <SelectValue>
                  {(v) =>
                    v ? (admins.find((a) => a.id === v)?.name ?? "") : t("selectAdminPlaceholder")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {admins.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      {error ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            {t("loadError")}
          </CardContent>
        </Card>
      ) : !adminId ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            {t("noAdmin")}
          </CardContent>
        </Card>
      ) : loading || !access ? (
        <Card>
          <CardContent className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : (
        <>
          {selectedAdmin && (
            <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4">
              <ProfileCell name={selectedAdmin.name} initials={selectedAdmin.initials} subtitle={selectedAdmin.email} />
            </div>
          )}

          {effective && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("effectiveTitle")}</CardTitle>
                <CardDescription>{t("effectiveHint")}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="font-heading text-2xl font-semibold tabular">{effective.view}</span>
                  <span className="text-sm text-muted-foreground">{t("effectiveViewable")}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-heading text-2xl font-semibold tabular">{effective.edit}</span>
                  <span className="text-sm text-muted-foreground">{t("effectiveEditable")}</span>
                </div>
                {effective.expiredGrantCount > 0 && (
                  <StatusBadge tone="warning" equalWidth={false} className="ms-auto">
                    {t("effectiveExpiredExcluded", { count: effective.expiredGrantCount })}
                  </StatusBadge>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("rolesGranted")}</CardTitle>
              <CardAction>
                <Button variant="outline" size="sm" onClick={openAddRole}>
                  <Plus className="size-4" />
                  {t("addRole")}
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              {access.grants.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{t("noGrants")}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {access.grants.map((g) => (
                    <li
                      key={g.id}
                      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border p-3"
                    >
                      <span className="font-medium">{roleName(g.roleId)}</span>
                      {expiryBadge(g)}
                      <span className="ms-auto text-xs text-muted-foreground">
                        {t("grantedByOn", {
                          name: g.grantedBy,
                          date: fmtDateTimeParts(g.grantedAt, locale).date,
                        })}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRevoking(g)}
                        className="hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 className="size-4" />
                        <span className="hidden sm:inline">{t("revoke")}</span>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("overlaysTitle")}</CardTitle>
              <CardDescription>{t("overlaysHint")}</CardDescription>
              <CardAction>
                <Button variant="outline" size="sm" onClick={openAddOverlay}>
                  <Plus className="size-4" />
                  {t("addOverlay")}
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              {access.overlays.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{t("noOverlays")}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {access.overlays.map((o) => (
                    <li
                      key={o.id}
                      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border p-3"
                    >
                      <span className="font-medium">{t(`mod_${o.moduleId}`)}</span>
                      <StatusBadge tone="neutral" equalWidth={false}>
                        {o.action === "edit" ? t("actionEdit") : t("actionView")}
                      </StatusBadge>
                      <span className="ms-auto text-xs text-muted-foreground">
                        {t("grantedByOn", {
                          name: o.grantedBy,
                          date: fmtDateTimeParts(o.grantedAt, locale).date,
                        })}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRemovingOverlay(o)}
                        className="hover:bg-danger/10 hover:text-danger"
                      >
                        <X className="size-4" />
                        <span className="hidden sm:inline">{t("remove")}</span>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={addRoleOpen} onOpenChange={setAddRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("grantRoleTitle")}</DialogTitle>
            <DialogDescription>{t("grantRoleDesc")}</DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            <Field
              label={t("role")}
              error={grantForm.formState.errors.roleId?.message}
              reserveMessage={false}
            >
              <Controller
                control={grantForm.control}
                name="roleId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => field.onChange(v ?? "")}>
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {(v) => (v ? roleName(v) : t("selectAdminPlaceholder"))}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label={t("expiryOptional")} hint={t("temporaryHint")} reserveMessage={false}>
              <Controller
                control={grantForm.control}
                name="expiresAt"
                render={({ field }) => (
                  <Popover open={expiryOpen} onOpenChange={setExpiryOpen}>
                    <PopoverTrigger
                      render={
                        <Button
                          type="button"
                          variant="outline"
                          size="lg"
                          className={cn(TRIGGER, field.value == null && "text-muted-foreground")}
                        />
                      }
                    >
                      {field.value != null ? fmtDateTimeParts(field.value, locale).date : t("noExpiry")}
                      <CalendarDays className="size-4 opacity-70" />
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={field.value != null ? new Date(field.value) : undefined}
                        onSelect={(d) => {
                          field.onChange(d ? d.getTime() : null);
                          setExpiryOpen(false);
                        }}
                        disabled={{ before: startOfTomorrow() }}
                        autoFocus
                      />
                      {field.value != null && (
                        <div className="border-t p-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              field.onChange(null);
                              setExpiryOpen(false);
                            }}
                          >
                            {t("noExpiry")}
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                )}
              />
            </Field>
          </DialogBody>
          <DialogFooter layout="split">
            <Button variant="outline" size="lg" onClick={() => setAddRoleOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button size="lg" onClick={grantForm.handleSubmit(onGrant)}>
              {t("grant")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addOverlayOpen} onOpenChange={setAddOverlayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addOverlayTitle")}</DialogTitle>
            <DialogDescription>{t("addOverlayDesc")}</DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            <Field label={t("module")} reserveMessage={false}>
              <Controller
                control={overlayForm.control}
                name="moduleId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => field.onChange(v as ModuleId)}>
                    <SelectTrigger className="w-full">
                      <SelectValue>{(v) => (v ? t(`mod_${v}`) : "")}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {MODULE_IDS.map((id) => (
                        <SelectItem key={id} value={id}>
                          {t(`mod_${id}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field
              label={t("action")}
              error={overlayForm.formState.errors.action?.message}
              reserveMessage={false}
            >
              <Controller
                control={overlayForm.control}
                name="action"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => field.onChange(v as PermissionAction)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {(v) => (v === "edit" ? t("actionEdit") : t("actionView"))}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view">{t("actionView")}</SelectItem>
                      <SelectItem value="edit">{t("actionEdit")}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </DialogBody>
          <DialogFooter layout="split">
            <Button variant="outline" size="lg" onClick={() => setAddOverlayOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button size="lg" onClick={overlayForm.handleSubmit(onAddOverlay)}>
              {t("add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={revoking != null} onOpenChange={(o) => !o && setRevoking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("revokeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {revoking && selectedAdmin
                ? t("revokeBody", { name: selectedAdmin.name, role: roleName(revoking.roleId) })
                : ""}
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
        open={removingOverlay != null}
        onOpenChange={(o) => !o && setRemovingOverlay(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("removeOverlayTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {removingOverlay && selectedAdmin
                ? t("removeOverlayBody", {
                    name: selectedAdmin.name,
                    action:
                      removingOverlay.action === "edit" ? t("actionEdit") : t("actionView"),
                    module: t(`mod_${removingOverlay.moduleId}`),
                  })
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter layout="split">
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveOverlay}
              className="bg-danger text-danger-foreground hover:bg-danger/90"
            >
              {t("remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
