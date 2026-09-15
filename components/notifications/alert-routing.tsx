"use client";

import { useCallback, useMemo, useState } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { SwitchField } from "@/components/common/switch-field";
import { StatusBadge } from "@/components/common/status-badge";
import { Chip } from "@/components/common/chip";
import { MultiSelect } from "@/components/common/multi-select";
import { DetailList } from "@/components/common/detail-list";
import {
  ChannelSelect,
  ChannelFilter,
  TemplateSelect,
} from "@/components/notifications/channel-select";
import { DataTable, toolbarIconButtonClass, type ServerTableState } from "@/components/common/data-table";
import { fmtDateTimeParts } from "@/lib/format";
import { useRetained } from "@/lib/use-retained";
import { apiErrorMessage } from "@/lib/api/error-message";
import { alertRouteSchema, type AlertRouteForm } from "@/lib/notifications/schemas";
import { alertRoutesStateToParams } from "@/lib/notifications/list-params";
import {
  AUDIENCE_TYPES,
  audienceCount,
  buildAudienceFilter,
  normalizeAudienceFilter,
} from "@/lib/notifications/dto";
import type { AudienceType, NotificationAlertRouteDto } from "@/lib/notifications/dto";
import {
  useAlertRoute,
  useAlertRoutes,
  useAllTemplates,
  useChannels,
  useCreateAlertRoute,
  useDeleteAlertRoute,
  useUpdateAlertRoute,
} from "@/lib/notifications/queries";
import { useRoles } from "@/lib/rbac/queries";
import { useAllAdminUsers } from "@/lib/user-management/queries";

const EMPTY_FORM: AlertRouteForm = {
  code: "",
  name: "",
  channelId: "",
  templateId: "",
  audienceType: "ALL_ADMINS",
  audienceIds: [],
  priority: 0,
  isActive: true,
};

export function AlertRoutingEditor() {
  const t = useTranslations("notifications");
  const tc = useTranslations("common");
  const te = useTranslations("apiErrors");
  const locale = useLocale();

  const [server, setServer] = useState<ServerTableState | null>(null);
  const params = useMemo(() => alertRoutesStateToParams(server), [server]);
  const routesQuery = useAlertRoutes(params);
  const routes = useMemo(() => routesQuery.data?.data ?? [], [routesQuery.data]);
  const total = routesQuery.data?.meta?.total ?? routes.length;
  const onServerStateChange = useCallback((state: ServerTableState) => setServer(state), []);

  const channelsQuery = useChannels();
  const channels = useMemo(() => channelsQuery.data ?? [], [channelsQuery.data]);
  const templatesQuery = useAllTemplates();
  const templates = useMemo(() => templatesQuery.data ?? [], [templatesQuery.data]);
  const rolesQuery = useRoles({ page: 1, perPage: 100 });
  const roleOptions = useMemo(
    () => (rolesQuery.data?.data ?? []).map((role) => ({ value: String(role.id), label: role.name })),
    [rolesQuery.data],
  );
  const usersQuery = useAllAdminUsers();
  const userOptions = useMemo(
    () => (usersQuery.data ?? []).map((user) => ({ value: user.id, label: user.name || user.email })),
    [usersQuery.data],
  );

  const channelName = useMemo(() => {
    const map = new Map(channels.map((channel) => [channel.id, channel.name || channel.code]));
    return (id: number | null | undefined) => (id == null ? "-" : map.get(id) ?? `#${id}`);
  }, [channels]);
  const templateName = useMemo(() => {
    const map = new Map(templates.map((template) => [template.id, template.name || template.code]));
    return (id: number | null | undefined) => (id == null ? "-" : map.get(id) ?? `#${id}`);
  }, [templates]);

  const createRoute = useCreateAlertRoute();
  const updateRoute = useUpdateAlertRoute();
  const deleteRoute = useDeleteAlertRoute();

  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<NotificationAlertRouteDto | null>(null);
  const [deleting, setDeleting] = useState<NotificationAlertRouteDto | null>(null);
  const [detail, setDetail] = useState<NotificationAlertRouteDto | null>(null);
  const shownDetail = useRetained(detail);
  const detailQuery = useAlertRoute(detail?.id ?? null);

  const schema = useMemo(
    () =>
      alertRouteSchema(
        {
          codeRequired: t("routing.codeRequired"),
          codeFormat: t("routing.codeFormat"),
          nameRequired: t("routing.nameRequired"),
          channelRequired: t("routing.channelRequired"),
          templateRequired: t("routing.templateRequired"),
          audienceRequired: t("routing.audienceRequired"),
          priorityInvalid: t("routing.priorityInvalid"),
        },
        { isCreate: dialogMode === "create" },
      ),
    [t, dialogMode],
  );

  const form = useForm<AlertRouteForm>({
    resolver: zodResolver(schema),
    mode: "onSubmit",
    defaultValues: EMPTY_FORM,
  });
  const { register, control, handleSubmit, reset, setValue, formState } = form;
  const audienceType = useWatch({ control, name: "audienceType" });

  const defaultChannelId = useMemo(() => (channels.length ? String(channels[0].id) : ""), [channels]);

  const openCreate = () => {
    reset({ ...EMPTY_FORM, channelId: defaultChannelId });
    setEditing(null);
    setDialogMode("create");
  };

  const openEdit = useCallback(
    (route: NotificationAlertRouteDto) => {
      const audience = normalizeAudienceFilter(route.audience_filter);
      reset({
        code: route.code,
        name: route.name,
        channelId: String(route.channel_id),
        templateId: route.template_id == null ? "" : String(route.template_id),
        audienceType: route.audience_type,
        audienceIds:
          route.audience_type === "ROLE"
            ? audience.role_ids.map(String)
            : route.audience_type === "USER_IDS"
              ? audience.user_ids
              : [],
        priority: route.priority,
        isActive: route.is_active,
      });
      setEditing(route);
      setDialogMode("edit");
    },
    [reset],
  );

  const closeDialog = () => setDialogMode(null);

  const onSubmit = async (values: AlertRouteForm) => {
    if (createRoute.isPending || updateRoute.isPending) return;
    const body = {
      name: values.name,
      channel_id: Number(values.channelId),
      template_id: Number(values.templateId),
      audience_type: values.audienceType,
      audience_filter: buildAudienceFilter(values.audienceType, values.audienceIds),
      priority: values.priority,
      is_active: values.isActive,
    };
    try {
      if (dialogMode === "edit" && editing) {
        await updateRoute.mutateAsync({ id: editing.id, body });
        toast.success(t("routing.savedToast"));
      } else {
        await createRoute.mutateAsync({ code: values.code, ...body });
        toast.success(t("routing.createdToast", { code: values.code }));
      }
      closeDialog();
    } catch (error) {
      toast.error(apiErrorMessage(error, te));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const target = deleting;
    try {
      await deleteRoute.mutateAsync(target.id);
      toast.success(t("routing.deletedToast", { code: target.code }));
      setDeleting(null);
    } catch (error) {
      toast.error(apiErrorMessage(error, te));
    }
  };

  const audienceLabel = useCallback(
    (route: NotificationAlertRouteDto) => {
      const label = t(`routing.audienceType.${route.audience_type}`);
      const count = audienceCount(route);
      return count == null ? label : `${label} (${count})`;
    },
    [t],
  );

  const columns = useMemo<ColumnDef<NotificationAlertRouteDto, unknown>[]>(
    () => [
      {
        id: "code",
        accessorFn: (route) => route.code,
        size: 200,
        header: t("routing.colCode"),
        cell: ({ row }) => <span className="font-medium">{row.original.code}</span>,
      },
      {
        id: "name",
        accessorFn: (route) => route.name,
        size: 200,
        header: t("routing.colName"),
        cell: ({ row }) => <span className="text-sm">{row.original.name}</span>,
      },
      {
        id: "channel",
        accessorFn: (route) => String(route.channel_id),
        size: 140,
        header: t("routing.colChannel"),
        enableSorting: false,
        meta: {
          filter: "select",
          filterLabel: t("routing.colChannel"),
          renderFilter: ({ value, setValue, searchLabel }) => (
            <ChannelFilter value={value} onChange={setValue} searchLabel={searchLabel} emptyLabel={tc("noResults")} />
          ),
        },
        cell: ({ row }) => <Chip>{row.original.channel?.name ?? channelName(row.original.channel_id)}</Chip>,
      },
      {
        id: "template",
        accessorFn: (route) => route.template_id ?? "",
        size: 180,
        header: t("routing.colTemplate"),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.template?.name ?? templateName(row.original.template_id)}
          </span>
        ),
      },
      {
        id: "audience",
        accessorFn: (route) => route.audience_type,
        size: 160,
        header: t("routing.colAudience"),
        enableSorting: false,
        meta: {
          filter: "select",
          filterOptions: AUDIENCE_TYPES.map((type) => ({ value: type, label: t(`routing.audienceType.${type}`) })),
          filterLabel: t("routing.colAudience"),
        },
        cell: ({ row }) => <span className="text-xs">{audienceLabel(row.original)}</span>,
      },
      {
        id: "priority",
        accessorFn: (route) => route.priority,
        size: 110,
        header: t("routing.colPriority"),
        cell: ({ row }) => <span className="text-xs tabular">{row.original.priority}</span>,
      },
      {
        id: "active",
        accessorFn: (route) => (route.is_active ? "1" : "0"),
        size: 120,
        header: t("routing.colActive"),
        enableSorting: false,
        meta: {
          filter: "select",
          filterOptions: [
            { value: "1", label: t("routing.active") },
            { value: "0", label: t("routing.inactive") },
          ],
          filterLabel: t("routing.colActive"),
        },
        cell: ({ row }) => (
          <StatusBadge tone={row.original.is_active ? "success" : "neutral"} equalWidth={false} className="min-w-[5.5rem]">
            {row.original.is_active ? t("routing.active") : t("routing.inactive")}
          </StatusBadge>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        size: 110,
        header: "",
        meta: { headClassName: "text-end", cellClassName: "text-end", noClip: true },
        cell: ({ row }) => {
          const route = row.original;
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
                        openEdit(route);
                      }}
                      aria-label={t("routing.edit")}
                    />
                  }
                >
                  <Pencil className="size-4" />
                </TooltipTrigger>
                <TooltipContent>{t("routing.edit")}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={(event) => {
                        event.stopPropagation();
                        setDeleting(route);
                      }}
                      aria-label={t("routing.delete")}
                      className="hover:bg-danger/10 hover:text-danger"
                    />
                  }
                >
                  <Trash2 className="size-4" />
                </TooltipTrigger>
                <TooltipContent>{t("routing.delete")}</TooltipContent>
              </Tooltip>
            </div>
          );
        },
      },
    ],
    [t, tc, channelName, templateName, audienceLabel, openEdit],
  );

  return (
    <div className="mx-auto max-w-7xl">
      <Card>
        <CardHeader>
          <CardTitle>{t("routing.title")}</CardTitle>
          <CardDescription>{t("routing.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {routesQuery.isError ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-sm text-muted-foreground">{t("routing.loadError")}</p>
              <Button variant="outline" size="sm" onClick={() => routesQuery.refetch()}>
                {tc("retry")}
              </Button>
            </div>
          ) : routesQuery.isPending ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={routes}
              pageSize={10}
              manualServer
              rowCount={total}
              onServerStateChange={onServerStateChange}
              searchPlaceholder={t("routing.search")}
              emptyLabel={t("routing.empty")}
              itemsLabel={t("routing.items")}
              onRowClick={(route) => setDetail(route)}
              rowAriaLabel={(route) => route.name}
              filterLabels={{
                filter: t("routing.filter"),
                clear: t("routing.clear"),
                clearFilters: tc("clearFilters"),
                search: t("routing.filterSearch"),
              }}
              enableFreeze
              maxFreeze={2}
              toolbar={
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        size="lg"
                        onClick={openCreate}
                        aria-label={t("routing.newRoute")}
                        className={toolbarIconButtonClass}
                      />
                    }
                  >
                    <Plus className="size-4" />
                    <span className="hidden sm:inline">{t("routing.newRoute")}</span>
                  </TooltipTrigger>
                  <TooltipContent>{t("routing.newRoute")}</TooltipContent>
                </Tooltip>
              }
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogMode != null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialogMode === "edit" ? t("routing.editTitle") : t("routing.createTitle")}</DialogTitle>
            <DialogDescription>{t("routing.drawerHint")}</DialogDescription>
          </DialogHeader>
          <Form onSubmit={handleSubmit(onSubmit)}>
            <DialogBody className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={t("routing.codeLabel")}
                  htmlFor="route-code"
                  error={formState.errors.code?.message}
                  reserveMessage={false}
                >
                  <Input
                    id="route-code"
                    {...register("code")}
                    placeholder={t("routing.codePlaceholder")}
                    disabled={dialogMode === "edit"}
                    autoFocus={dialogMode === "create"}
                  />
                </Field>
                <Field
                  label={t("routing.nameLabel")}
                  htmlFor="route-name"
                  error={formState.errors.name?.message}
                  reserveMessage={false}
                >
                  <Input id="route-name" {...register("name")} placeholder={t("routing.namePlaceholder")} />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={t("routing.channelLabel")}
                  htmlFor="route-channel"
                  error={formState.errors.channelId?.message}
                  reserveMessage={false}
                >
                  <Controller
                    control={control}
                    name="channelId"
                    render={({ field }) => (
                      <ChannelSelect
                        id="route-channel"
                        ariaLabel={t("routing.channelLabel")}
                        value={field.value}
                        onChange={field.onChange}
                        selectedLabel={field.value ? channelName(Number(field.value)) : undefined}
                        placeholder={t("routing.channelPlaceholder")}
                        searchPlaceholder={tc("search")}
                        emptyLabel={tc("noResults")}
                      />
                    )}
                  />
                </Field>
                <Field
                  label={t("routing.templateLabel")}
                  htmlFor="route-template"
                  error={formState.errors.templateId?.message}
                  reserveMessage={false}
                >
                  <Controller
                    control={control}
                    name="templateId"
                    render={({ field }) => (
                      <TemplateSelect
                        id="route-template"
                        ariaLabel={t("routing.templateLabel")}
                        value={field.value}
                        onChange={field.onChange}
                        selectedLabel={field.value ? templateName(Number(field.value)) : undefined}
                        placeholder={t("routing.templatePlaceholder")}
                        searchPlaceholder={tc("search")}
                        emptyLabel={tc("noResults")}
                      />
                    )}
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("routing.audienceLabel")} reserveMessage={false}>
                  <Controller
                    control={control}
                    name="audienceType"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange((value ?? "ALL_ADMINS") as AudienceType);
                          setValue("audienceIds", []);
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue>{(value) => (value ? t(`routing.audienceType.${value}`) : "")}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {AUDIENCE_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {t(`routing.audienceType.${type}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
                <Field
                  label={t("routing.priorityLabel")}
                  htmlFor="route-priority"
                  error={formState.errors.priority?.message}
                  reserveMessage={false}
                >
                  <Input
                    id="route-priority"
                    type="number"
                    min={0}
                    {...register("priority", { valueAsNumber: true })}
                  />
                </Field>
              </div>

              {audienceType !== "ALL_ADMINS" && (
                <Field
                  label={audienceType === "ROLE" ? t("routing.rolesLabel") : t("routing.usersLabel")}
                  error={formState.errors.audienceIds?.message}
                  reserveMessage={false}
                >
                  <Controller
                    control={control}
                    name="audienceIds"
                    render={({ field }) => (
                      <MultiSelect
                        options={audienceType === "ROLE" ? roleOptions : userOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder={t("routing.audiencePlaceholder")}
                        searchPlaceholder={tc("search")}
                      />
                    )}
                  />
                </Field>
              )}

              <Controller
                control={control}
                name="isActive"
                render={({ field }) => (
                  <SwitchField
                    label={t("routing.activeLabel")}
                    description={t("routing.activeHelp")}
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </DialogBody>
          </Form>
          <DialogFooter layout="split">
            <Button variant="outline" size="lg" onClick={closeDialog}>
              {tc("cancel")}
            </Button>
            <Button
              size="lg"
              onClick={handleSubmit(onSubmit)}
              loading={createRoute.isPending || updateRoute.isPending}
              disabled={dialogMode === "edit" && !formState.isDirty}
            >
              {dialogMode === "edit" ? tc("save") : t("routing.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleting != null}
        onOpenChange={(open) => {
          if (!open && !deleteRoute.isPending) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("routing.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting ? t("routing.deleteBody", { code: deleting.code }) : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter layout="split">
            <AlertDialogCancel disabled={deleteRoute.isPending}>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              loading={deleteRoute.isPending}
              className="bg-danger text-danger-foreground hover:bg-danger/90"
            >
              {t("routing.deleteConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={detail != null} onOpenChange={(open) => !open && setDetail(null)}>
        {shownDetail && (
          <SheetContent>
            <SheetHeader>
              <SheetTitle>{shownDetail.name}</SheetTitle>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Chip>{shownDetail.channel?.name ?? channelName(shownDetail.channel_id)}</Chip>
                <StatusBadge tone={shownDetail.is_active ? "success" : "neutral"} equalWidth={false}>
                  {shownDetail.is_active ? t("routing.active") : t("routing.inactive")}
                </StatusBadge>
              </div>
            </SheetHeader>
            <SheetBody className="flex flex-col gap-4">
              {detailQuery.isError ? (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <p className="text-sm text-muted-foreground">{t("routing.detailLoadError")}</p>
                  <Button variant="outline" size="sm" onClick={() => detailQuery.refetch()}>
                    {tc("retry")}
                  </Button>
                </div>
              ) : detailQuery.isPending ? (
                <div className="flex flex-col gap-4">
                  <Skeleton className="h-40 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : (
                (() => {
                  const record = detailQuery.data;
                  return (
                    <DetailList
                      items={[
                        { label: t("routing.colCode"), value: record.code },
                        { label: t("routing.colName"), value: record.name },
                        { label: t("routing.colChannel"), value: record.channel?.name ?? channelName(record.channel_id) },
                        {
                          label: t("routing.colTemplate"),
                          value:
                            record.template?.name ??
                            (record.template_id ? templateName(record.template_id) : t("routing.noTemplate")),
                        },
                        { label: t("routing.colAudience"), value: audienceLabel(record) },
                        { label: t("routing.colPriority"), value: String(record.priority) },
                        {
                          label: t("routing.colActive"),
                          value: record.is_active ? t("routing.active") : t("routing.inactive"),
                        },
                        {
                          label: t("routing.colCreated"),
                          value: record.created_at
                            ? (() => {
                                const { date, time } = fmtDateTimeParts(Date.parse(record.created_at), locale);
                                return `${date} ${time}`;
                              })()
                            : t("routing.notSet"),
                        },
                      ]}
                    />
                  );
                })()
              )}
            </SheetBody>
            <SheetFooter>
              <Button
                size="lg"
                disabled={detailQuery.isPending || detailQuery.isError}
                onClick={() => {
                  const target = detailQuery.data ?? shownDetail;
                  setDetail(null);
                  openEdit(target);
                }}
              >
                {t("routing.edit")}
              </Button>
            </SheetFooter>
          </SheetContent>
        )}
      </Sheet>
    </div>
  );
}
