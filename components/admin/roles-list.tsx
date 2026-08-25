"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import { Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
import { DataTable, toolbarIconButtonClass } from "@/components/common/data-table";
import { fmtDateTimeParts } from "@/lib/format";
import { useRbacStore } from "@/lib/rbac/store";
import { useAuthStore } from "@/lib/auth/store";
import { fetchRoles } from "@/lib/rbac/api";
import { countGranted } from "@/lib/rbac/modules";
import type { Role } from "@/lib/rbac/types";

export function RolesList() {
  const t = useTranslations("rbac");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  const rolesState = useRbacStore((s) => s.roles);
  const permissions = useRbacStore((s) => s.permissions);
  const createRole = useRbacStore((s) => s.createRole);
  const updateRole = useRbacStore((s) => s.updateRole);
  const deleteRole = useRbacStore((s) => s.deleteRole);
  const actorName = useAuthStore((s) => s.session?.name ?? "You");

  const [rows, setRows] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [nameError, setNameError] = useState("");
  const [deleting, setDeleting] = useState<Role | null>(null);

  useEffect(() => {
    let active = true;
    fetchRoles()
      .then((r) => {
        if (!active) return;
        setRows(r);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError(true);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [rolesState]);

  const openCreate = () => {
    setDialogMode("create");
    setEditing(null);
    setName("");
    setDescription("");
    setNameError("");
  };

  const openEdit = (role: Role) => {
    setDialogMode("edit");
    setEditing(role);
    setName(role.name);
    setDescription(role.description);
    setNameError("");
  };

  const closeDialog = () => setDialogMode(null);

  const submitDialog = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(t("nameRequired"));
      return;
    }
    if (dialogMode === "edit" && editing) {
      updateRole(editing.id, { name: trimmed, description: description.trim() });
      toast.success(t("renamedToast"));
      closeDialog();
      return;
    }
    const id = createRole({ name: trimmed, description: description.trim(), by: actorName });
    toast.success(t("createdToast", { name: trimmed }));
    closeDialog();
    router.push(`/admin/roles/${id}`);
  };

  const confirmDelete = () => {
    if (!deleting) return;
    deleteRole(deleting.id);
    toast.success(t("deletedToast", { name: deleting.name }));
    setDeleting(null);
  };

  const columns = useMemo<ColumnDef<Role, unknown>[]>(
    () => [
      {
        id: "role",
        accessorFn: (r) => `${r.name} ${r.description}`,
        size: 340,
        header: t("colRole"),
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col">
            <span className="font-medium">{row.original.name}</span>
            <span className="truncate text-xs text-muted-foreground">{row.original.description}</span>
          </div>
        ),
      },
      {
        id: "type",
        accessorFn: (r) => (r.builtIn ? t("typeBuiltin") : t("typeCustom")),
        size: 150,
        header: t("colType"),
        meta: {
          filter: "select",
          filterOptions: [
            { value: t("typeBuiltin"), label: t("typeBuiltin") },
            { value: t("typeCustom"), label: t("typeCustom") },
          ],
          filterLabel: t("colType"),
        },
        cell: ({ row }) =>
          row.original.builtIn ? (
            <Tooltip>
              <TooltipTrigger render={<span className="w-fit cursor-default" />}>
                <StatusBadge tone="neutral" equalWidth={false} className="min-w-[6.5rem] gap-1">
                  <Lock className="size-3" />
                  {t("typeBuiltin")}
                </StatusBadge>
              </TooltipTrigger>
              <TooltipContent>{t("builtinHint")}</TooltipContent>
            </Tooltip>
          ) : (
            <StatusBadge tone="warning" equalWidth={false} className="min-w-[6.5rem]">
              {t("typeCustom")}
            </StatusBadge>
          ),
      },
      {
        id: "access",
        accessorFn: (r) => (permissions[r.id] ? countGranted(permissions[r.id]).view : 0),
        size: 150,
        header: t("colAccess"),
        cell: ({ row }) => {
          const p = permissions[row.original.id];
          const c = p ? countGranted(p) : { view: 0, edit: 0 };
          return (
            <span className="text-xs text-muted-foreground tabular">
              {t("accessSummary", { view: c.view, edit: c.edit })}
            </span>
          );
        },
      },
      {
        id: "created",
        accessorFn: (r) => r.createdAt,
        size: 190,
        header: t("colCreated"),
        cell: ({ row }) => (
          <div className="flex flex-col leading-tight">
            <span className="text-xs">{t("createdBy", { name: row.original.createdBy })}</span>
            <span className="text-xs text-muted-foreground tabular">
              {fmtDateTimeParts(row.original.createdAt, locale).date}
            </span>
          </div>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        size: 150,
        header: "",
        meta: { headClassName: "text-end", cellClassName: "text-end" },
        cell: ({ row }) => {
          const role = row.original;
          return (
            <div className="flex items-center justify-end gap-1">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(role);
                      }}
                      disabled={role.builtIn}
                      aria-label={t("rename")}
                    />
                  }
                >
                  <Pencil className="size-4" />
                </TooltipTrigger>
                <TooltipContent>{role.builtIn ? t("builtinHint") : t("rename")}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleting(role);
                      }}
                      disabled={role.builtIn}
                      aria-label={t("delete")}
                      className="hover:bg-danger/10 hover:text-danger"
                    />
                  }
                >
                  <Trash2 className="size-4" />
                </TooltipTrigger>
                <TooltipContent>{role.builtIn ? t("builtinHint") : t("delete")}</TooltipContent>
              </Tooltip>
            </div>
          );
        },
      },
    ],
    [t, locale, permissions],
  );

  return (
    <div className="mx-auto max-w-7xl">
      <Card>
        <CardHeader>
          <CardTitle>{t("rolesTitle")}</CardTitle>
          <CardDescription>{t("rolesSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-sm text-muted-foreground">{t("loadError")}</p>
            </div>
          ) : loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={rows}
              pageSize={10}
              searchPlaceholder={t("search")}
              emptyLabel={t("empty")}
              itemsLabel={t("items")}
              onRowClick={(r) => router.push(`/admin/roles/${r.id}`)}
              rowAriaLabel={(r) => r.name}
              getSearchText={(r) => `${r.name} ${r.description}`}
              filterLabels={{
                filter: t("filter"),
                clear: t("clear"),
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
                        variant="default"
                        size="lg"
                        onClick={openCreate}
                        aria-label={t("newRole")}
                        className={toolbarIconButtonClass}
                      />
                    }
                  >
                    <Plus className="size-4" />
                    <span className="hidden sm:inline">{t("newRole")}</span>
                  </TooltipTrigger>
                  <TooltipContent>{t("newRole")}</TooltipContent>
                </Tooltip>
              }
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogMode != null} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogMode === "edit" ? t("editTitle") : t("createTitle")}</DialogTitle>
            {dialogMode === "create" && <DialogDescription>{t("createDesc")}</DialogDescription>}
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            <Field label={t("nameLabel")} htmlFor="role-name" error={nameError} reserveMessage={false}>
              <Input
                id="role-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) setNameError("");
                }}
                placeholder={t("namePlaceholder")}
                autoFocus
              />
            </Field>
            <Field label={t("descLabel")} htmlFor="role-desc" reserveMessage={false}>
              <Textarea
                id="role-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("descPlaceholder")}
              />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" size="lg" onClick={closeDialog}>
              {tc("cancel")}
            </Button>
            <Button
              size="lg"
              onClick={submitDialog}
              disabled={
                dialogMode === "edit" &&
                editing != null &&
                name.trim() === editing.name &&
                description.trim() === editing.description
              }
            >
              {dialogMode === "edit" ? tc("save") : t("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting != null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting ? t("deleteBody", { name: deleting.name }) : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-danger text-danger-foreground hover:bg-danger/90"
            >
              {t("deleteConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
