"use client";

import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import { Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
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
import { DataTable, toolbarIconButtonClass, type ServerTableState } from "@/components/common/data-table";
import { fmtDateTimeParts } from "@/lib/format";
import { apiErrorMessage } from "@/lib/api/error-message";
import { useCreateRole, useDeleteRole, useRoles, useUpdateRole } from "@/lib/rbac/queries";
import { serverStateToParams } from "@/lib/rbac/list-params";
import { roleSchema, type RoleForm } from "@/lib/rbac/schemas";
import type { RoleDto } from "@/lib/rbac/dto";

export function RolesList() {
  const t = useTranslations("rbac");
  const tc = useTranslations("common");
  const te = useTranslations("apiErrors");
  const locale = useLocale();
  const router = useRouter();

  const [server, setServer] = useState<ServerTableState | null>(null);
  const params = useMemo(() => serverStateToParams(server), [server]);
  const rolesQuery = useRoles(params);
  const roles = useMemo(() => rolesQuery.data?.data ?? [], [rolesQuery.data]);
  const total = rolesQuery.data?.meta?.total ?? roles.length;
  const onServerStateChange = useCallback((state: ServerTableState) => setServer(state), []);
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();

  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<RoleDto | null>(null);
  const [deleting, setDeleting] = useState<RoleDto | null>(null);

  const schema = useMemo(() => roleSchema({ nameRequired: t("nameRequired") }), [t]);
  const form = useForm<RoleForm>({
    resolver: zodResolver(schema),
    mode: "onSubmit",
    defaultValues: { name: "", description: "" },
  });
  const { register, handleSubmit, reset, formState } = form;

  const openCreate = () => {
    reset({ name: "", description: "" });
    setEditing(null);
    setDialogMode("create");
  };

  const openEdit = useCallback(
    (role: RoleDto) => {
      reset({ name: role.name, description: role.description ?? "" });
      setEditing(role);
      setDialogMode("edit");
    },
    [reset],
  );

  const closeDialog = () => setDialogMode(null);

  const onSubmit = async (values: RoleForm) => {
    if (createRole.isPending || updateRole.isPending) return;
    try {
      if (dialogMode === "edit" && editing) {
        await updateRole.mutateAsync({ id: editing.id, body: { name: values.name, description: values.description } });
        toast.success(t("renamedToast"));
        closeDialog();
        return;
      }
      const created = await createRole.mutateAsync({ name: values.name, description: values.description });
      toast.success(t("createdToast", { name: values.name }));
      closeDialog();
      router.push(`/admin/roles/${created.id}`);
    } catch (error) {
      toast.error(apiErrorMessage(error, te));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const target = deleting;
    try {
      await deleteRole.mutateAsync(target.id);
      toast.success(t("deletedToast", { name: target.name }));
      setDeleting(null);
    } catch (error) {
      toast.error(apiErrorMessage(error, te));
    }
  };

  const columns = useMemo<ColumnDef<RoleDto, unknown>[]>(
    () => [
      {
        id: "role",
        accessorFn: (role) => `${role.name} ${role.description ?? ""}`,
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
        accessorFn: (role) => (role.is_system ? t("typeBuiltin") : t("typeCustom")),
        size: 150,
        header: t("colType"),
        meta: {
          filter: "select",
          filterOptions: [
            { value: "1", label: t("typeBuiltin") },
            { value: "0", label: t("typeCustom") },
          ],
          filterLabel: t("colType"),
        },
        cell: ({ row }) =>
          row.original.is_system ? (
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
        accessorFn: (role) => role.permissions?.length ?? 0,
        enableSorting: false,
        size: 150,
        header: t("colAccess"),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground tabular">
            {t("permCount", { count: row.original.permissions?.length ?? 0 })}
          </span>
        ),
      },
      {
        id: "created",
        accessorFn: (role) => (role.created_at ? new Date(role.created_at).getTime() : 0),
        size: 160,
        header: t("colCreated"),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground tabular">
            {row.original.created_at ? fmtDateTimeParts(new Date(row.original.created_at).getTime(), locale).date : "—"}
          </span>
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
                      onClick={(event) => {
                        event.stopPropagation();
                        openEdit(role);
                      }}
                      disabled={role.is_system}
                      aria-label={t("rename")}
                    />
                  }
                >
                  <Pencil className="size-4" />
                </TooltipTrigger>
                <TooltipContent>{role.is_system ? t("builtinHint") : t("rename")}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={(event) => {
                        event.stopPropagation();
                        setDeleting(role);
                      }}
                      disabled={role.is_system}
                      aria-label={t("delete")}
                      className="hover:bg-danger/10 hover:text-danger"
                    />
                  }
                >
                  <Trash2 className="size-4" />
                </TooltipTrigger>
                <TooltipContent>{role.is_system ? t("builtinHint") : t("delete")}</TooltipContent>
              </Tooltip>
            </div>
          );
        },
      },
    ],
    [t, locale, openEdit],
  );

  return (
    <div className="mx-auto max-w-7xl">
      <Card>
        <CardHeader>
          <CardTitle>{t("rolesTitle")}</CardTitle>
          <CardDescription>{t("rolesSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {rolesQuery.isError ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-sm text-muted-foreground">{t("loadError")}</p>
              <Button variant="outline" size="sm" onClick={() => rolesQuery.refetch()}>
                {tc("retry")}
              </Button>
            </div>
          ) : rolesQuery.isPending ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={roles}
              pageSize={10}
              manualServer
              rowCount={total}
              onServerStateChange={onServerStateChange}
              searchPlaceholder={t("search")}
              emptyLabel={t("empty")}
              itemsLabel={t("items")}
              onRowClick={(role) => router.push(`/admin/roles/${role.id}`)}
              rowAriaLabel={(role) => role.name}
              getSearchText={(role) => `${role.name} ${role.description ?? ""}`}
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

      <Dialog open={dialogMode != null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogMode === "edit" ? t("editTitle") : t("createTitle")}</DialogTitle>
            {dialogMode === "create" && <DialogDescription>{t("createDesc")}</DialogDescription>}
          </DialogHeader>
          <Form onSubmit={handleSubmit(onSubmit)}>
            <DialogBody className="flex flex-col gap-4">
              <Field
                label={t("nameLabel")}
                htmlFor="role-name"
                error={formState.errors.name?.message}
                reserveMessage={false}
              >
                <Input id="role-name" {...register("name")} placeholder={t("namePlaceholder")} autoFocus />
              </Field>
              <Field label={t("descLabel")} htmlFor="role-desc" reserveMessage={false}>
                <Textarea id="role-desc" rows={3} {...register("description")} placeholder={t("descPlaceholder")} />
              </Field>
            </DialogBody>
          </Form>
          <DialogFooter layout="split">
            <Button variant="outline" size="lg" onClick={closeDialog}>
              {tc("cancel")}
            </Button>
            <Button
              size="lg"
              onClick={handleSubmit(onSubmit)}
              loading={createRole.isPending || updateRole.isPending}
              disabled={dialogMode === "edit" && !formState.isDirty}
            >
              {dialogMode === "edit" ? tc("save") : t("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleting != null}
        onOpenChange={(open) => {
          if (!open && !deleteRole.isPending) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting ? t("deleteBody", { name: deleting.name }) : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter layout="split">
            <AlertDialogCancel disabled={deleteRole.isPending}>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              loading={deleteRole.isPending}
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
