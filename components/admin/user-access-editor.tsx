"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { CalendarIcon, Check, ChevronsUpDown, Lock, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
import { Chip } from "@/components/common/chip";
import { InlineRecordLink } from "@/components/common/record-link";
import { dbDateTimeToEpoch, recordHref } from "@/lib/record-links";
import { fmtDate, fmtDateTimeParts } from "@/lib/format";
import { cn } from "@/lib/utils";
import { autoFocusSearch } from "@/lib/pointer";
import { apiErrorMessage } from "@/lib/api/error-message";
import { useAllAdminUsers } from "@/lib/user-management/queries";
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
import { dateKey, endOfDayIso, parseDateKey, todayKey } from "@/lib/rbac/expiry";

const TRIGGER = "w-full justify-between font-normal";

function ExpiryDateField({
  value,
  onChange,
  placeholder,
  clearLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  clearLabel: string;
}) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const selected = value ? parseDateKey(value) : undefined;

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="lg"
              className={cn(TRIGGER, "min-w-0 flex-1", !selected && "text-muted-foreground")}
            />
          }
        >
          {selected ? fmtDate(value, locale) : placeholder}
          <CalendarIcon className="size-4 opacity-70" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected}
            disabled={(date) => dateKey(date) <= todayKey()}
            onSelect={(date) => {
              if (date) {
                onChange(dateKey(date));
                setOpen(false);
              }
            }}
            autoFocus
          />
        </PopoverContent>
      </Popover>
      {selected && (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button type="button" variant="ghost" size="icon-lg" aria-label={clearLabel} onClick={() => onChange("")} />
            }
          >
            <X className="size-4" />
          </TooltipTrigger>
          <TooltipContent>{clearLabel}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

type RowAction = {
  label: string;
  ariaLabel: string;
  onClick: () => void;
  disabledReason?: string;
};

function EditButton({
  label,
  ariaLabel,
  onClick,
  disabledReason,
  icon,
  className,
}: RowAction & { icon: ReactNode; className?: string }) {
  const button = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-label={ariaLabel}
      onClick={onClick}
      focusableWhenDisabled
      disabled={Boolean(disabledReason)}
      className={cn(
        "data-[disabled]:hover:bg-transparent",
        className,
      )}
    />
  );
  return disabledReason ? (
    <Tooltip>
      <TooltipTrigger render={button}>
        {icon}
        {label}
      </TooltipTrigger>
      <TooltipContent>{disabledReason}</TooltipContent>
    </Tooltip>
  ) : (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-label={ariaLabel}
      onClick={onClick}
      className={className}
    >
      {icon}
      {label}
    </Button>
  );
}

function GrantRow({
  title,
  tags,
  meta,
  status,
  action,
}: {
  title: ReactNode;
  tags?: ReactNode;
  meta?: ReactNode[];
  status: ReactNode;
  action?: RowAction;
}) {
  const details = (meta ?? []).filter(Boolean);
  return (
    <li
      className={cn(
        "grid gap-x-3 gap-y-1.5 py-3 sm:px-4 @2xl:items-center @2xl:gap-x-4",
        action
          ? "grid-cols-[minmax(0,1fr)_auto] @2xl:grid-cols-[minmax(0,1fr)_auto_auto]"
          : "grid-cols-[minmax(0,1fr)] @2xl:grid-cols-[minmax(0,1fr)_auto]",
      )}
    >
      <div className="col-start-1 row-start-1 flex min-w-0 flex-wrap items-center gap-2 self-center">
        {title}
        {tags}
      </div>
      {details.length > 0 && (
        <div className="col-span-full row-start-2 flex min-w-0 flex-col gap-0.5 text-xs text-muted-foreground @2xl:col-span-1 @2xl:col-start-1 @2xl:flex-row @2xl:flex-wrap @2xl:items-center @2xl:gap-x-1.5">
          {details.map((detail, index) => (
            <span key={index} className="flex min-w-0 items-center gap-x-1.5 [overflow-wrap:anywhere]">
              {index > 0 && (
                <span aria-hidden className="hidden @2xl:inline">
                  ·
                </span>
              )}
              {detail}
            </span>
          ))}
        </div>
      )}
      <div className="col-span-full row-start-3 justify-self-start @2xl:col-span-1 @2xl:col-start-2 @2xl:row-span-2 @2xl:row-start-1 @2xl:justify-self-end">
        {status}
      </div>
      {action && (
        <EditButton
          {...action}
          icon={<X className="size-3.5" />}
          className="col-start-2 row-start-1 self-start text-danger hover:bg-danger/10 hover:text-danger @2xl:col-start-3 @2xl:row-span-2 @2xl:self-center"
        />
      )}
    </li>
  );
}

function DrawerSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex min-h-7 items-center justify-between gap-3">
        <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h4>
        {action}
      </div>
      {children}
    </section>
  );
}

export function UserAccessEditor({
  userId,
  userName,
  variant,
  canEdit,
  blockedReason,
}: {
  userId: string;
  userName: string;
  variant: "page" | "drawer";
  canEdit: boolean;
  blockedReason?: string;
}) {
  const t = useTranslations("rbac");
  const tc = useTranslations("common");
  const ta = useTranslations("apiErrors");
  const locale = useLocale();

  const adminsQuery = useAllAdminUsers();
  const adminNameById = useMemo(
    () => new Map((adminsQuery.data ?? []).map((admin) => [admin.id, admin.name || admin.email])),
    [adminsQuery.data],
  );

  const grantDate = (value: string | null | undefined): string | null => {
    if (!value) return null;
    const epoch = dbDateTimeToEpoch(value) ?? Date.parse(value);
    return Number.isNaN(epoch) ? null : fmtDateTimeParts(epoch, locale).date;
  };
  const grantMeta = (grantedAt: string | null | undefined, grantedBy: string | null | undefined) => {
    const date = grantDate(grantedAt);
    if (!date) return null;
    const granterName = grantedBy ? adminNameById.get(grantedBy) : undefined;
    return (
      <span>
        {t("grantedOn", { date })}
        {grantedBy && granterName && (
          <>
            {" "}
            {t.rich("grantedBy", {
              name: granterName,
              link: (chunks) => (
                <InlineRecordLink href={recordHref("adminAccount", grantedBy)}>{chunks}</InlineRecordLink>
              ),
            })}
          </>
        )}
      </span>
    );
  };
  const expiryStatus = (expiresAt: string | null | undefined) => {
    const date = grantDate(expiresAt);
    return date ? (
      <StatusBadge tone="warning" equalWidth={false}>
        {t("expiresOn", { date })}
      </StatusBadge>
    ) : (
      <span className="text-xs text-muted-foreground">{t("noExpiry")}</span>
    );
  };

  const accessQuery = useAdminAccess(userId || null);
  const grantedRoles = useMemo(() => accessQuery.data?.roles ?? [], [accessQuery.data]);
  const directPermissions = useMemo(() => accessQuery.data?.permissions ?? [], [accessQuery.data]);
  const effectivePermissionCount = accessQuery.data?.effectivePermissionCount ?? 0;
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
    () =>
      grantSchema(
        { roleRequired: t("roleRequired"), duplicateRole: t("duplicateRole"), expiryPast: t("expiryPast") },
        { existingRoleIds: grantedRoleIds },
      ),
    [t, grantedRoleIds],
  );
  const grantForm = useForm<GrantForm>({
    resolver: zodResolver(grantSchemaMemo),
    mode: "onSubmit",
    defaultValues: { roleId: "", expiresOn: "" },
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
    grantForm.reset({ roleId: "", expiresOn: "" });
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
      await attachRoles.mutateAsync({
        userId,
        roleIds: [Number(values.roleId)],
        expiresAt: endOfDayIso(values.expiresOn),
      });
      toast.success(t("grantedToast", { role: rolesCatalog.data?.data.find((role) => String(role.id) === values.roleId)?.name ?? "" }));
      setAddRoleOpen(false);
    } catch (error) {
      toast.error(apiErrorMessage(error, ta));
    }
  };

  const onAddOverlay = async (values: OverlayForm) => {
    try {
      await syncPermissions.mutateAsync({
        userId,
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
      await detachRoles.mutateAsync({ userId, roleIds: [Number(revoking.id)] });
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
        userId,
        permissionIds: directPermissionIds.filter((id) => id !== target.id),
      });
      toast.success(t("overlayRemovedToast"));
      setRemovingOverlay(null);
    } catch (error) {
      toast.error(apiErrorMessage(error, ta));
    }
  };


  const removeAction = (label: string, ariaLabel: string, onClick: () => void): RowAction | undefined =>
    canEdit ? { label, ariaLabel, onClick, disabledReason: blockedReason } : undefined;
  const addButton = (label: string, onClick: () => void) =>
    canEdit ? (
      <EditButton
        label={label}
        ariaLabel={label}
        onClick={onClick}
        disabledReason={blockedReason}
        icon={<Plus className="size-4" />}
      />
    ) : null;

  const rolesList =
    grantedRoles.length === 0 ? (
      <p className="py-6 text-center text-sm text-muted-foreground">{t("noGrants")}</p>
    ) : (
      <ul className="@container divide-y sm:overflow-hidden sm:rounded-lg sm:border">
        {grantedRoles.map((role) => (
          <GrantRow
            key={role.id}
            title={
              <Link
                href={recordHref("role", role.id)}
                className="font-medium underline-offset-2 hover:text-primary hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {role.name}
              </Link>
            }
            tags={
              role.is_system ? (
                <StatusBadge tone="neutral" equalWidth={false}>
                  <Lock className="me-1 size-3" />
                  {t("typeBuiltin")}
                </StatusBadge>
              ) : (
                <StatusBadge tone="warning" equalWidth={false}>
                  {t("typeCustom")}
                </StatusBadge>
              )
            }
            meta={[grantMeta(role.granted_at, role.granted_by_admin_id)]}
            status={expiryStatus(role.expires_at)}
            action={removeAction(t("revoke"), t("revokeRoleAria", { name: role.name }), () => setRevoking(role))}
          />
        ))}
      </ul>
    );

  const overlaysList =
    directPermissions.length === 0 ? (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {variant === "drawer" ? t("noDirectPermissions") : t("noOverlays")}
      </p>
    ) : (
      <ul className="@container divide-y sm:overflow-hidden sm:rounded-lg sm:border">
        {directPermissions.map((permission) => (
          <GrantRow
            key={permission.id}
            title={<span className="font-medium">{permissionLabel(permission)}</span>}
            tags={
              permission.is_sensitive ? (
                <Chip variant="soft" className="bg-danger/10 px-2 py-0.5 text-danger">
                  {t("sensitive")}
                </Chip>
              ) : undefined
            }
            meta={[
              <span key="code" className="tabular">
                {permissionCode(permission)}
              </span>,
              grantMeta(permission.granted_at, permission.granted_by_admin_id),
            ]}
            status={expiryStatus(permission.expires_at)}
            action={removeAction(
              t("remove"),
              t("removeOverlayAria", { name: permissionLabel(permission) }),
              () => setRemovingOverlay(permission),
            )}
          />
        ))}
      </ul>
    );

  const loadError = (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <p className="text-sm text-muted-foreground">{t("loadError")}</p>
      <Button variant="outline" size="sm" onClick={() => accessQuery.refetch()}>
        {tc("retry")}
      </Button>
    </div>
  );
  const loading = (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  );

  const content =
    variant === "drawer" ? (
      accessQuery.isError ? (
        loadError
      ) : accessQuery.isPending ? (
        loading
      ) : (
        <>
          <DrawerSection
            title={t("rolesCount", { count: grantedRoles.length })}
            action={addButton(t("addRole"), openAddRole)}
          >
            {rolesList}
          </DrawerSection>
          <DrawerSection
            title={t("directPermissionsCount", { count: directPermissions.length })}
            action={addButton(t("addPermission"), openAddOverlay)}
          >
            {overlaysList}
            {effectivePermissionCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {t("effectivePermissions", { count: effectivePermissionCount })}
              </p>
            )}
          </DrawerSection>
        </>
      )
    ) : accessQuery.isError ? (
      <Card>
        <CardContent>{loadError}</CardContent>
      </Card>
    ) : accessQuery.isPending ? (
      <Card>
        <CardContent>{loading}</CardContent>
      </Card>
    ) : (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("rolesGranted")}</CardTitle>
            <CardAction>{addButton(t("addRole"), openAddRole)}</CardAction>
          </CardHeader>
          <CardContent>{rolesList}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("overlaysTitle")}</CardTitle>
            <CardDescription>{t("overlaysHint")}</CardDescription>
            <CardAction>{addButton(t("addOverlay"), openAddOverlay)}</CardAction>
          </CardHeader>
          <CardContent>{overlaysList}</CardContent>
        </Card>
      </>
    );

  return (
    <>
      {content}

      <Dialog open={addRoleOpen} onOpenChange={setAddRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("grantRoleTitle")}</DialogTitle>
            <DialogDescription>{t("grantRoleDesc")}</DialogDescription>
          </DialogHeader>
          <Form onSubmit={grantForm.handleSubmit(onGrant)}>
            <DialogBody className="flex flex-col gap-4">
              <Field label={t("role")} required error={grantForm.formState.errors.roleId?.message} reserveMessage={false}>
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
              <Field
                label={t("expiryOptional")}
                hint={t("temporaryHint")}
                error={grantForm.formState.errors.expiresOn?.message}
                reserveMessage={false}
              >
                <Controller
                  control={grantForm.control}
                  name="expiresOn"
                  render={({ field }) => (
                    <ExpiryDateField
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={t("noExpiry")}
                      clearLabel={t("clearExpiry")}
                    />
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
                required
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
              {revoking ? t("revokeBody", { name: userName, role: revoking.name }) : ""}
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
              {removingOverlay
                ? t("removeOverlayBody", { name: userName, permission: permissionLabel(removingOverlay) })
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
    </>
  );
}
