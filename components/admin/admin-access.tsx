"use client";

import { useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Check, ChevronsUpDown, Lock, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { autoFocusSearch } from "@/lib/pointer";
import { apiErrorMessage } from "@/lib/api/error-message";
import { useAdminUsers } from "@/lib/user-management/queries";
import {
  useAdminAccess,
  useAttachUserRoles,
  useDetachUserRoles,
  usePermissions,
  useRoles,
  useSyncUserPermissions,
} from "@/lib/rbac/queries";
import { permissionCode, permissionLabel, type PermissionDto, type RoleDto } from "@/lib/rbac/dto";
import { grantSchema, overlaySchema, type GrantForm, type OverlayForm } from "@/lib/rbac/schemas";
import type { AdminUserRow } from "@/lib/user-management/types";

const TRIGGER = "w-full justify-between font-normal";

export function AdminAccess() {
  const t = useTranslations("rbac");
  const tc = useTranslations("common");
  const ta = useTranslations("apiErrors");

  const [pickedAdmin, setPickedAdmin] = useState<AdminUserRow | null>(null);
  const adminId = pickedAdmin?.id ?? "";
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminSearch, setAdminSearch] = useState("");

  const adminsQuery = useAdminUsers({ page: 1, perPage: 100 });
  const adminResults = useMemo(() => {
    const term = adminSearch.trim().toLowerCase();
    const rows = (adminsQuery.data?.data ?? []).filter(
      (admin) => !term || admin.name.toLowerCase().includes(term) || admin.email.toLowerCase().includes(term),
    );
    if (!pickedAdmin) return rows;
    return [pickedAdmin, ...rows.filter((admin) => admin.id !== pickedAdmin.id)];
  }, [adminsQuery.data, pickedAdmin, adminSearch]);

  const accessQuery = useAdminAccess(adminId || null);
  const grantedRoles = useMemo(() => accessQuery.data?.roles ?? [], [accessQuery.data]);
  const directPermissions = useMemo(() => accessQuery.data?.permissions ?? [], [accessQuery.data]);
  const grantedRoleIds = useMemo(() => grantedRoles.map((role) => String(role.id)), [grantedRoles]);
  const directPermissionIds = useMemo(
    () => directPermissions.map((permission) => permission.id),
    [directPermissions],
  );

  const rolesCatalog = useRoles({ page: 1, perPage: 100 });
  const permissionsCatalog = usePermissions();

  const attachRoles = useAttachUserRoles();
  const detachRoles = useDetachUserRoles();
  const syncPermissions = useSyncUserPermissions();

  const [addRoleOpen, setAddRoleOpen] = useState(false);
  const [addOverlayOpen, setAddOverlayOpen] = useState(false);
  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  const [permPickerOpen, setPermPickerOpen] = useState(false);
  const [roleQuery, setRoleQuery] = useState("");
  const [permQuery, setPermQuery] = useState("");
  const [revoking, setRevoking] = useState<RoleDto | null>(null);
  const [removingOverlay, setRemovingOverlay] = useState<PermissionDto | null>(null);

  const grantSchemaMemo = useMemo(
    () => grantSchema({ roleRequired: t("roleRequired"), duplicateRole: t("duplicateRole") }, { existingRoleIds: grantedRoleIds }),
    [t, grantedRoleIds],
  );
  const grantForm = useForm<GrantForm>({
    resolver: zodResolver(grantSchemaMemo),
    mode: "onSubmit",
    defaultValues: { roleId: "" },
  });

  const overlaySchemaMemo = useMemo(
    () =>
      overlaySchema(
        { permissionRequired: t("permissionRequired"), duplicateOverlay: t("duplicateOverlay") },
        { existingIds: directPermissionIds.map(String) },
      ),
    [t, directPermissionIds],
  );
  const overlayForm = useForm<OverlayForm>({
    resolver: zodResolver(overlaySchemaMemo),
    mode: "onSubmit",
    defaultValues: { permissionId: "" },
  });

  const availableRoles = useMemo(() => {
    const term = roleQuery.trim().toLowerCase();
    return (rolesCatalog.data?.data ?? [])
      .filter((role) => !grantedRoleIds.includes(String(role.id)))
      .filter((role) => !term || role.name.toLowerCase().includes(term));
  }, [rolesCatalog.data, grantedRoleIds, roleQuery]);

  const availablePermissions = useMemo(() => {
    const term = permQuery.trim().toLowerCase();
    const taken = new Set(directPermissionIds);
    return (permissionsCatalog.data ?? [])
      .filter((permission) => !taken.has(permission.id))
      .filter((permission) => !term || permissionLabel(permission).toLowerCase().includes(term) || permissionCode(permission).toLowerCase().includes(term));
  }, [permissionsCatalog.data, directPermissionIds, permQuery]);

  const openAddRole = () => {
    grantForm.reset({ roleId: "" });
    setRoleQuery("");
    setAddRoleOpen(true);
  };
  const openAddOverlay = () => {
    overlayForm.reset({ permissionId: "" });
    setPermQuery("");
    setAddOverlayOpen(true);
  };

  const onGrant = async (values: GrantForm) => {
    try {
      await attachRoles.mutateAsync({ userId: adminId, roleIds: [Number(values.roleId)] });
      toast.success(t("grantedToast", { role: rolesCatalog.data?.data.find((role) => String(role.id) === values.roleId)?.name ?? "" }));
      setAddRoleOpen(false);
    } catch (error) {
      toast.error(apiErrorMessage(error, ta));
    }
  };

  const onAddOverlay = async (values: OverlayForm) => {
    try {
      await syncPermissions.mutateAsync({
        userId: adminId,
        permissionIds: [...directPermissionIds, Number(values.permissionId)],
      });
      toast.success(t("overlayAddedToast"));
      setAddOverlayOpen(false);
    } catch (error) {
      toast.error(apiErrorMessage(error, ta));
    }
  };

  const confirmRevoke = async () => {
    if (!revoking) return;
    try {
      await detachRoles.mutateAsync({ userId: adminId, roleIds: [Number(revoking.id)] });
      toast.success(t("revokedToast"));
      setRevoking(null);
    } catch (error) {
      toast.error(apiErrorMessage(error, ta));
    }
  };

  const confirmRemoveOverlay = async () => {
    if (!removingOverlay) return;
    const target = removingOverlay;
    try {
      await syncPermissions.mutateAsync({
        userId: adminId,
        permissionIds: directPermissionIds.filter((id) => id !== target.id),
      });
      toast.success(t("overlayRemovedToast"));
      setRemovingOverlay(null);
    } catch (error) {
      toast.error(apiErrorMessage(error, ta));
    }
  };

  const pickAdmin = (admin: AdminUserRow) => {
    setPickedAdmin(admin);
    setAdminOpen(false);
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
            <Popover open={adminOpen} onOpenChange={setAdminOpen}>
              <PopoverTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className={cn(TRIGGER, "sm:w-80", !pickedAdmin && "text-muted-foreground")}
                  />
                }
              >
                {pickedAdmin ? pickedAdmin.name : t("selectAdminPlaceholder")}
                <ChevronsUpDown className="size-4 opacity-70" />
              </PopoverTrigger>
              <PopoverContent align="start" className="w-(--anchor-width) p-1.5 sm:w-80">
                <div className="relative flex items-center">
                  <Search className="pointer-events-none absolute start-2.5 size-4 text-muted-foreground" />
                  <Input
                    size="sm"
                    autoFocus={autoFocusSearch()}
                    placeholder={t("adminSearch")}
                    value={adminSearch}
                    onChange={(event) => setAdminSearch(event.target.value)}
                    className="ps-8"
                  />
                </div>
                <div className="mt-1.5 max-h-64 overflow-y-auto">
                  {adminsQuery.isPending ? (
                    <div className="flex flex-col gap-1 p-1">
                      <Skeleton className="h-9 w-full" />
                      <Skeleton className="h-9 w-full" />
                      <Skeleton className="h-9 w-full" />
                    </div>
                  ) : adminsQuery.isError ? (
                    <div className="flex flex-col items-center gap-2 px-2 py-6 text-center">
                      <p className="text-xs text-muted-foreground">{t("loadError")}</p>
                      <Button variant="outline" size="sm" onClick={() => adminsQuery.refetch()}>
                        {tc("retry")}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      {adminResults.map((admin) => (
                        <button
                          key={admin.id}
                          type="button"
                          onClick={() => pickAdmin(admin)}
                          className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-start text-sm transition-colors hover:bg-muted"
                        >
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate font-medium">{admin.name}</span>
                            <span className="truncate text-xs text-muted-foreground">{admin.email}</span>
                          </span>
                          {admin.id === adminId && <Check className="size-4 shrink-0 text-primary" />}
                        </button>
                      ))}
                      {adminResults.length === 0 && (
                        <p className="px-2 py-6 text-center text-xs text-muted-foreground">{t("noAdmins")}</p>
                      )}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </Field>
        </CardContent>
      </Card>

      {!adminId ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">{t("noAdmin")}</CardContent>
        </Card>
      ) : accessQuery.isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-muted-foreground">{t("loadError")}</p>
            <Button variant="outline" size="sm" onClick={() => accessQuery.refetch()}>
              {tc("retry")}
            </Button>
          </CardContent>
        </Card>
      ) : accessQuery.isPending ? (
        <Card>
          <CardContent className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : (
        <>
          {pickedAdmin && (
            <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4">
              <ProfileCell name={pickedAdmin.name} initials={pickedAdmin.initials} subtitle={pickedAdmin.email} />
            </div>
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
              {grantedRoles.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{t("noGrants")}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {grantedRoles.map((role) => (
                    <li key={role.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border p-3">
                      <span className="font-medium">{role.name}</span>
                      {role.is_system ? (
                        <StatusBadge tone="neutral" equalWidth={false}>
                          <Lock className="me-1 size-3" />
                          {t("typeBuiltin")}
                        </StatusBadge>
                      ) : (
                        <StatusBadge tone="warning" equalWidth={false}>
                          {t("typeCustom")}
                        </StatusBadge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRevoking(role)}
                        className="ms-auto hover:bg-danger/10 hover:text-danger"
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
              {directPermissions.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{t("noOverlays")}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {directPermissions.map((permission) => (
                    <li
                      key={permission.id}
                      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border p-3"
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="font-medium">{permissionLabel(permission)}</span>
                        <span className="truncate text-xs text-muted-foreground tabular">
                          {permissionCode(permission)}
                        </span>
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRemovingOverlay(permission)}
                        className="ms-auto hover:bg-danger/10 hover:text-danger"
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
          <Form onSubmit={grantForm.handleSubmit(onGrant)}>
            <DialogBody className="flex flex-col gap-4">
              <Field label={t("role")} error={grantForm.formState.errors.roleId?.message} reserveMessage={false}>
                <Controller
                  control={grantForm.control}
                  name="roleId"
                  render={({ field }) => (
                    <Popover open={rolePickerOpen} onOpenChange={setRolePickerOpen}>
                      <PopoverTrigger
                        render={
                          <Button
                            type="button"
                            variant="outline"
                            size="lg"
                            className={cn(TRIGGER, !field.value && "text-muted-foreground")}
                          />
                        }
                      >
                        {field.value ? rolesCatalog.data?.data.find((role) => String(role.id) === field.value)?.name : t("selectAdminPlaceholder")}
                        <ChevronsUpDown className="size-4 opacity-70" />
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-(--anchor-width) p-1.5">
                        <div className="relative flex items-center">
                          <Search className="pointer-events-none absolute start-2.5 size-4 text-muted-foreground" />
                          <Input
                            size="sm"
                            autoFocus={autoFocusSearch()}
                            placeholder={t("roleSearch")}
                            value={roleQuery}
                            onChange={(event) => setRoleQuery(event.target.value)}
                            className="ps-8"
                          />
                        </div>
                        <div className="mt-1.5 max-h-56 overflow-y-auto">
                          {rolesCatalog.isError ? (
                            <div className="flex flex-col items-center gap-2 px-2 py-6 text-center">
                              <p className="text-xs text-muted-foreground">{t("loadError")}</p>
                              <Button variant="outline" size="sm" onClick={() => rolesCatalog.refetch()}>
                                {tc("retry")}
                              </Button>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              {availableRoles.map((role) => (
                                <button
                                  key={role.id}
                                  type="button"
                                  onClick={() => {
                                    field.onChange(String(role.id));
                                    setRolePickerOpen(false);
                                  }}
                                  className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-start text-sm transition-colors hover:bg-muted"
                                >
                                  <span className="truncate">{role.name}</span>
                                  {String(role.id) === field.value && (
                                    <Check className="size-4 shrink-0 text-primary" />
                                  )}
                                </button>
                              ))}
                              {availableRoles.length === 0 && (
                                <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                                  {t("noRolesToAdd")}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                />
              </Field>
            </DialogBody>
          </Form>
          <DialogFooter layout="split">
            <Button variant="outline" size="lg" onClick={() => setAddRoleOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button size="lg" onClick={grantForm.handleSubmit(onGrant)} loading={attachRoles.isPending}>
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
          <Form onSubmit={overlayForm.handleSubmit(onAddOverlay)}>
            <DialogBody className="flex flex-col gap-4">
              <Field
                label={t("permission")}
                error={overlayForm.formState.errors.permissionId?.message}
                reserveMessage={false}
              >
                <Controller
                  control={overlayForm.control}
                  name="permissionId"
                  render={({ field }) => (
                    <Popover open={permPickerOpen} onOpenChange={setPermPickerOpen}>
                      <PopoverTrigger
                        render={
                          <Button
                            type="button"
                            variant="outline"
                            size="lg"
                            className={cn(TRIGGER, !field.value && "text-muted-foreground")}
                          />
                        }
                      >
                        {(() => {
                          if (!field.value) return t("selectPermission");
                          const selected = (permissionsCatalog.data ?? []).find(
                            (permission) => String(permission.id) === field.value,
                          );
                          return selected ? permissionLabel(selected) : field.value;
                        })()}
                        <ChevronsUpDown className="size-4 opacity-70" />
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-(--anchor-width) p-1.5">
                        <div className="relative flex items-center">
                          <Search className="pointer-events-none absolute start-2.5 size-4 text-muted-foreground" />
                          <Input
                            size="sm"
                            autoFocus={autoFocusSearch()}
                            placeholder={t("permissionSearch")}
                            value={permQuery}
                            onChange={(event) => setPermQuery(event.target.value)}
                            className="ps-8"
                          />
                        </div>
                        <div className="mt-1.5 max-h-56 overflow-y-auto">
                          {permissionsCatalog.isError ? (
                            <div className="flex flex-col items-center gap-2 px-2 py-6 text-center">
                              <p className="text-xs text-muted-foreground">{t("loadError")}</p>
                              <Button variant="outline" size="sm" onClick={() => permissionsCatalog.refetch()}>
                                {tc("retry")}
                              </Button>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              {availablePermissions.map((permission) => (
                                <button
                                  key={permission.id}
                                  type="button"
                                  onClick={() => {
                                    field.onChange(String(permission.id));
                                    setPermPickerOpen(false);
                                  }}
                                  className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-start text-sm transition-colors hover:bg-muted"
                                >
                                  <span className="flex min-w-0 flex-col">
                                    <span className="truncate">{permissionLabel(permission)}</span>
                                    <span className="truncate text-xs text-muted-foreground tabular">
                                      {permissionCode(permission)}
                                    </span>
                                  </span>
                                  {String(permission.id) === field.value && (
                                    <Check className="size-4 shrink-0 text-primary" />
                                  )}
                                </button>
                              ))}
                              {availablePermissions.length === 0 && (
                                <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                                  {t("noPermissions")}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                />
              </Field>
            </DialogBody>
          </Form>
          <DialogFooter layout="split">
            <Button variant="outline" size="lg" onClick={() => setAddOverlayOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button size="lg" onClick={overlayForm.handleSubmit(onAddOverlay)} loading={syncPermissions.isPending}>
              {t("add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={revoking != null} onOpenChange={(open) => !open && !detachRoles.isPending && setRevoking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("revokeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {revoking && pickedAdmin ? t("revokeBody", { name: pickedAdmin.name, role: revoking.name }) : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter layout="split">
            <AlertDialogCancel disabled={detachRoles.isPending}>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRevoke}
              loading={detachRoles.isPending}
              className="bg-danger text-danger-foreground hover:bg-danger/90"
            >
              {t("revokeConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={removingOverlay != null}
        onOpenChange={(open) => !open && !syncPermissions.isPending && setRemovingOverlay(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("removeOverlayTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {removingOverlay && pickedAdmin
                ? t("removeOverlayBody", { name: pickedAdmin.name, permission: permissionLabel(removingOverlay) })
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter layout="split">
            <AlertDialogCancel disabled={syncPermissions.isPending}>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveOverlay}
              loading={syncPermissions.isPending}
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
