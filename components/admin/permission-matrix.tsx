"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Lock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ButtonRow } from "@/components/ui/button-row";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/common/status-badge";
import { SensitiveTag, type Sensitivity } from "@/components/common/sensitive-tag";
import { MODULES } from "@/lib/rbac/modules";
import { useRbacStore } from "@/lib/rbac/store";
import { fetchRolePermissions } from "@/lib/rbac/api";
import type { RolePermissions } from "@/lib/rbac/types";

export function PermissionMatrix({ roleId }: { roleId: string }) {
  const t = useTranslations("rbac");
  const tc = useTranslations("common");
  const router = useRouter();

  const role = useRbacStore((s) => s.roles.find((r) => r.id === roleId));
  const savedPerms = useRbacStore((s) => s.permissions[roleId]);
  const setPermissions = useRbacStore((s) => s.setPermissions);

  const [draft, setDraft] = useState<RolePermissions | null>(null);
  const [dirty, setDirty] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    fetchRolePermissions(roleId)
      .then((p) => {
        if (!active) return;
        setDraft(p);
        setLoaded(true);
      })
      .catch(() => {
        if (!active) return;
        setError(true);
        setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [roleId]);

  const locked = role?.tier === "superadmin";

  const sensLabels: Record<Sensitivity, string> = {
    financial: t("sensFinancial"),
    pii: t("sensPii"),
    destructive: t("sensDestructive"),
  };

  const setView = (id: keyof RolePermissions, value: boolean) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [id]: { view: value, edit: value ? prev[id].edit : false } };
      return next;
    });
    setDirty(true);
  };

  const setEdit = (id: keyof RolePermissions, value: boolean) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [id]: { view: value ? true : prev[id].view, edit: value } };
      return next;
    });
    setDirty(true);
  };

  const onSave = () => {
    if (!draft) return;
    setPermissions(roleId, draft);
    setDirty(false);
    toast.success(t("savedToast"));
    router.push("/admin/roles");
  };

  const onReset = () => {
    if (savedPerms) setDraft(savedPerms);
    setDirty(false);
  };

  const goList = () => router.push("/admin/roles");
  const backBtn = (
    <Button variant="outline" size="lg" onClick={goList}>
      <ArrowLeft className="size-4 rtl:-scale-x-100" />
      {t("backToRoles")}
    </Button>
  );

  if (error) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-sm text-muted-foreground">{t("permLoadError")}</p>
            {backBtn}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!loaded || !draft) {
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
            <StatusBadge tone={role.builtIn ? "neutral" : "warning"} equalWidth={false} className="gap-1">
              {role.builtIn ? <Lock className="size-3" /> : null}
              {role.builtIn ? t("typeBuiltin") : t("typeCustom")}
            </StatusBadge>
          </div>
          <p className="text-sm text-muted-foreground">{t("matrixSubtitle", { role: role.name })}</p>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("colModule")}</TableHead>
                  <TableHead className="w-24">
                    <div className="text-center">{t("colView")}</div>
                  </TableHead>
                  <TableHead className="w-24">
                    <div className="text-center">{t("colEdit")}</div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MODULES.map((m) => {
                  const cell = draft[m.id];
                  return (
                    <TableRow key={m.id} className="h-12">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{t(m.labelKey)}</span>
                          <SensitiveTag kinds={m.sensitivity} labels={sensLabels} />
                        </div>
                      </TableCell>
                      <TableCell className="w-24 px-2!">
                        <div className="flex justify-center">
                          <Checkbox
                            checked={cell.view}
                            onCheckedChange={(v) => setView(m.id, v === true)}
                            disabled={locked}
                            aria-label={`${t(m.labelKey)} — ${t("colView")}`}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="w-24 px-2!">
                        <div className="flex justify-center">
                          <Checkbox
                            checked={cell.edit}
                            onCheckedChange={(v) => setEdit(m.id, v === true)}
                            disabled={locked}
                            aria-label={`${t(m.labelKey)} — ${t("colEdit")}`}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t("legend")}
            </span>
            <SensitiveTag
              kinds={["financial", "pii", "destructive"]}
              labels={sensLabels}
              showLabel
            />
          </div>
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
                <Button variant="secondary" size="lg" onClick={onReset} disabled={!dirty}>
                  {t("reset")}
                </Button>
                <Button size="lg" onClick={onSave} disabled={!dirty}>
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
