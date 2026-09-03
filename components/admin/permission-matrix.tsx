"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, ChevronDown, Lock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ButtonRow } from "@/components/ui/button-row";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/common/status-badge";
import { Chip } from "@/components/common/chip";
import { cn } from "@/lib/utils";
import { apiErrorMessage } from "@/lib/api/error-message";
import { usePermissionModules, usePermissions, useRole, useSyncRolePermissions } from "@/lib/rbac/queries";
import { permissionCode, permissionLabel, type PermissionDto } from "@/lib/rbac/dto";

interface ModuleGroup {
  key: string;
  name: string;
  permissions: PermissionDto[];
}

export function PermissionMatrix({ roleId }: { roleId: string }) {
  const t = useTranslations("rbac");
  const tc = useTranslations("common");
  const te = useTranslations("apiErrors");
  const router = useRouter();

  const idNum = Number(roleId);
  const roleQuery = useRole(idNum);
  const modulesQuery = usePermissionModules();
  const permissionsQuery = usePermissions();
  const sync = useSyncRolePermissions();

  const role = roleQuery.data;
  const loading = roleQuery.isPending || modulesQuery.isPending || permissionsQuery.isPending;
  const isError = roleQuery.isError || modulesQuery.isError || permissionsQuery.isError;

  const groups = useMemo<ModuleGroup[]>(() => {
    const perms = permissionsQuery.data ?? [];
    const modMeta = new Map<number, { name: string; order: number }>();
    for (const permissionModule of modulesQuery.data ?? [])
      modMeta.set(permissionModule.id, { name: permissionModule.name, order: permissionModule.display_order });
    const byModule = new Map<number, PermissionDto[]>();
    for (const permission of perms) {
      const arr = byModule.get(permission.module_id) ?? [];
      arr.push(permission);
      byModule.set(permission.module_id, arr);
    }
    const byCode = (first: PermissionDto, second: PermissionDto) => permissionCode(first).localeCompare(permissionCode(second));
    const built = [...byModule.entries()].map(([mid, list]) => {
      const meta = modMeta.get(mid);
      return {
        key: String(mid),
        name: meta?.name ?? list[0]?.module?.name ?? t("otherModule"),
        order: meta?.order ?? 9999,
        permissions: [...list].sort(byCode),
      };
    });
    built.sort((first, second) => first.order - second.order || first.name.localeCompare(second.name));
    return built.map(({ key, name, permissions }) => ({ key, name, permissions }));
  }, [modulesQuery.data, permissionsQuery.data, t]);

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [original, setOriginal] = useState<Set<number>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const seededRef = useRef<number | null>(null);

  const toggleGroup = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  useEffect(() => {
    if (!role) return;
    if (seededRef.current === role.id) return;
    const ids = new Set((role.permissions ?? []).map((permission) => permission.id));
    setSelected(ids);
    setOriginal(new Set(ids));
    seededRef.current = role.id;
  }, [role]);

  const locked = role?.is_system ?? false;
  const dirty = useMemo(
    () => selected.size !== original.size || [...selected].some((id) => !original.has(id)),
    [selected, original],
  );

  const toggle = (id: number, on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleModule = (perms: PermissionDto[], on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const permission of perms) {
        if (on) next.add(permission.id);
        else next.delete(permission.id);
      }
      return next;
    });
  };

  const onSave = async () => {
    if (!role) return;
    try {
      await sync.mutateAsync({ id: role.id, permissionIds: [...selected] });
      setOriginal(new Set(selected));
      toast.success(t("savedToast"));
      router.push("/admin/roles");
    } catch (error) {
      toast.error(apiErrorMessage(error, te));
    }
  };

  const onReset = () => setSelected(new Set(original));

  const goList = () => router.push("/admin/roles");
  const backBtn = (
    <Button variant="outline" size="lg" onClick={goList}>
      <ArrowLeft className="size-4 rtl:-scale-x-100" />
      {t("backToRoles")}
    </Button>
  );

  if (isError) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-sm text-muted-foreground">{t("permLoadError")}</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  roleQuery.refetch();
                  modulesQuery.refetch();
                  permissionsQuery.refetch();
                }}
              >
                {tc("retry")}
              </Button>
              {backBtn}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex flex-col gap-1">
              <p className="font-medium">{t("notFound")}</p>
              <p className="text-sm text-muted-foreground">{t("notFoundBody")}</p>
            </div>
            {backBtn}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{role.name}</CardTitle>
            <StatusBadge tone={role.is_system ? "neutral" : "warning"} equalWidth={false} className="gap-1">
              {role.is_system ? <Lock className="size-3" /> : null}
              {role.is_system ? t("typeBuiltin") : t("typeCustom")}
            </StatusBadge>
          </div>
          <p className="text-sm text-muted-foreground">{t("matrixModulesSubtitle")}</p>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {groups.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            groups.map((group) => {
              const chosen = group.permissions.filter((permission) => selected.has(permission.id)).length;
              const allOn = chosen === group.permissions.length;
              const someOn = chosen > 0 && !allOn;
              const open = !collapsed.has(group.key);
              return (
                <div key={group.key} className="overflow-hidden rounded-xl border">
                  <div
                    className={cn(
                      "group flex items-center justify-between gap-2 bg-muted/40 px-2 py-1.5 pe-4 transition-colors hover:bg-muted/70",
                      open && "border-b",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.key)}
                      aria-expanded={open}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1 text-start outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      <ChevronDown
                        className={cn(
                          "size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:text-foreground motion-reduce:transition-none",
                          !open && "-rotate-90 rtl:rotate-90",
                        )}
                      />
                      <span className="truncate text-sm font-semibold">{group.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground tabular">
                        {chosen}/{group.permissions.length}
                      </span>
                    </button>
                    {!locked && (
                      <Label className="cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground">
                        <Checkbox
                          checked={allOn}
                          indeterminate={someOn}
                          onCheckedChange={(checked) => toggleModule(group.permissions, checked === true)}
                          aria-label={`${group.name} — ${t("selectAll")}`}
                        />
                        {t("selectAll")}
                      </Label>
                    )}
                  </div>
                  <div
                    className={cn(
                      "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
                      open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                    )}
                  >
                    <div className="overflow-hidden">
                      <div className="flex flex-col gap-1 p-2" inert={open ? undefined : true}>
                        {group.permissions.map((permission) => {
                      const on = selected.has(permission.id);
                      return (
                        <Label
                          key={permission.id}
                          className={cn(
                            "flex min-w-0 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 font-normal transition-colors hover:bg-muted/60",
                            on && "bg-primary/[0.05] hover:bg-primary/[0.09]",
                            locked && "cursor-default",
                          )}
                        >
                          <Checkbox
                            checked={on}
                            onCheckedChange={(checked) => toggle(permission.id, checked === true)}
                            disabled={locked}
                            aria-label={permissionLabel(permission)}
                          />
                          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <div className="flex min-w-0 items-center gap-1.5">
                              <span className="truncate text-sm">{permissionLabel(permission)}</span>
                              {permission.is_sensitive && (
                                <Chip
                                  variant="soft"
                                  className="shrink-0 bg-danger/10 px-2 py-0.5 text-danger"
                                >
                                  {t("sensitive")}
                                </Chip>
                              )}
                            </div>
                            <span className="truncate text-xs text-muted-foreground tabular">
                              {permissionCode(permission)}
                            </span>
                          </div>
                          {permission.action && (
                            <Chip variant="outline" className="shrink-0 px-2 py-0.5 uppercase">
                              {permission.action}
                            </Chip>
                          )}
                        </Label>
                      );
                    })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>

        <CardFooter className="flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          {locked ? (
            <>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="size-4 shrink-0" />
                {t("superadminLocked")}
              </p>
              {backBtn}
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="lg" onClick={goList}>
                  {tc("cancel")}
                </Button>
                {dirty && <span className="text-xs text-muted-foreground">{t("unsaved")}</span>}
              </div>
              <ButtonRow>
                <Button variant="secondary" size="lg" onClick={onReset} disabled={!dirty || sync.isPending}>
                  {t("reset")}
                </Button>
                <Button size="lg" onClick={onSave} loading={sync.isPending} disabled={!dirty}>
                  {t("saveChanges")}
                </Button>
              </ButtonRow>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
