"use client";

import { useCallback, useMemo, useState } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import { Braces, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { DetailList } from "@/components/common/detail-list";
import { ChannelSelect, ChannelFilter } from "@/components/notifications/channel-select";
import { DataTable, toolbarIconButtonClass } from "@/components/common/data-table";
import { fmtDateTimeParts } from "@/lib/format";
import { useRetained } from "@/lib/use-retained";
import { apiErrorMessage } from "@/lib/api/error-message";
import { MERGE_VARIABLES, htmlToPlainText, renderTemplate } from "@/lib/notifications/variables";
import { sanitizeTemplateHtml } from "@/lib/notifications/sanitize";
import { templateSchema, type TemplateForm } from "@/lib/notifications/schemas";
import { localizedText } from "@/lib/notifications/dto";
import {
  useAllTemplates,
  useChannels,
  useCreateTemplate,
  useDeleteTemplate,
  useTemplate,
  useUpdateTemplate,
} from "@/lib/notifications/queries";
import type { NotificationTemplateDto } from "@/lib/notifications/dto";

function VarInserter({ label, onInsert }: { label: string; onInsert: (token: string) => void }) {
  const t = useTranslations("notifications");
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button type="button" variant="ghost" size="xs" className="gap-1 text-xs text-muted-foreground" />}
      >
        <Braces className="size-3.5" />
        {label}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 p-1">
        <div className="flex flex-col gap-0.5">
          {MERGE_VARIABLES.map((variable) => (
            <button
              key={variable.token}
              type="button"
              onClick={() => {
                onInsert(variable.token);
                setOpen(false);
              }}
              className="flex flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-start transition-colors hover:bg-muted"
            >
              <span className="font-mono text-xs">{`{${variable.token}}`}</span>
              <span className="text-xs text-muted-foreground">{t(`variables.${variable.token}`)}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function hasMergeVariable(html: string): boolean {
  return MERGE_VARIABLES.some((variable) => html.includes(`{${variable.token}}`));
}

const EMPTY_FORM: TemplateForm = {
  code: "",
  name: "",
  channelId: "",
  subjectEn: "",
  subjectAr: "",
  bodyEn: "",
  bodyAr: "",
  isActive: true,
};

export function MessageTemplates() {
  const t = useTranslations("notifications");
  const tc = useTranslations("common");
  const te = useTranslations("apiErrors");
  const locale = useLocale();

  const templatesQuery = useAllTemplates();
  const channelsQuery = useChannels();
  const templates = useMemo(() => templatesQuery.data ?? [], [templatesQuery.data]);
  const channels = useMemo(() => channelsQuery.data ?? [], [channelsQuery.data]);
  const channelName = useMemo(() => {
    const map = new Map(channels.map((channel) => [channel.id, channel.name || channel.code]));
    return (id: number | null | undefined) => (id == null ? "-" : map.get(id) ?? `#${id}`);
  }, [channels]);

  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();

  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<NotificationTemplateDto | null>(null);
  const [deleting, setDeleting] = useState<NotificationTemplateDto | null>(null);
  const [detail, setDetail] = useState<NotificationTemplateDto | null>(null);
  const shownDetail = useRetained(detail);
  const detailQuery = useTemplate(detail?.id ?? null);

  const schema = useMemo(
    () =>
      templateSchema(
        {
          codeRequired: t("templates.codeRequired"),
          codeFormat: t("templates.codeFormat"),
          nameRequired: t("templates.nameRequired"),
          channelRequired: t("templates.channelRequired"),
          subjectRequired: t("templates.subjectRequired"),
          bodyRequired: t("templates.bodyRequired"),
        },
        { isCreate: dialogMode === "create" },
      ),
    [t, dialogMode],
  );

  const form = useForm<TemplateForm>({
    resolver: zodResolver(schema),
    mode: "onSubmit",
    defaultValues: EMPTY_FORM,
  });
  const { reset, register, control, handleSubmit, formState } = form;
  const bodyEnVal = useWatch({ control, name: "bodyEn" });
  const bodyArVal = useWatch({ control, name: "bodyAr" });

  const editorLabels = {
    bold: t("editor.bold"),
    italic: t("editor.italic"),
    alignLeft: t("editor.alignLeft"),
    alignCenter: t("editor.alignCenter"),
    alignRight: t("editor.alignRight"),
  };

  const defaultChannelId = useMemo(() => (channels.length ? String(channels[0].id) : ""), [channels]);

  const openCreate = () => {
    reset({ ...EMPTY_FORM, channelId: defaultChannelId });
    setEditing(null);
    setDialogMode("create");
  };

  const openEdit = useCallback(
    (template: NotificationTemplateDto) => {
      reset({
        code: template.code,
        name: template.name,
        channelId: String(template.channel_id),
        subjectEn: template.subject?.EN ?? "",
        subjectAr: template.subject?.AR ?? "",
        bodyEn: template.body?.EN ?? "",
        bodyAr: template.body?.AR ?? "",
        isActive: template.is_active,
      });
      setEditing(template);
      setDialogMode("edit");
    },
    [reset],
  );

  const closeDialog = () => setDialogMode(null);

  const onSubmit = async (values: TemplateForm) => {
    if (createTemplate.isPending || updateTemplate.isPending) return;
    const subject = {
      EN: values.subjectEn.trim(),
      ...(values.subjectAr.trim() ? { AR: values.subjectAr.trim() } : {}),
    };
    const body = {
      EN: values.bodyEn,
      ...(htmlToPlainText(values.bodyAr).trim() ? { AR: values.bodyAr } : {}),
    };
    try {
      if (dialogMode === "edit" && editing) {
        await updateTemplate.mutateAsync({
          id: editing.id,
          body: { name: values.name, channel_id: Number(values.channelId), subject, body, is_active: values.isActive },
        });
        toast.success(t("templates.updatedToast"));
      } else {
        await createTemplate.mutateAsync({
          code: values.code,
          name: values.name,
          channel_id: Number(values.channelId),
          subject,
          body,
          is_active: values.isActive,
        });
        toast.success(t("templates.createdToast", { code: values.code }));
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
      await deleteTemplate.mutateAsync(target.id);
      toast.success(t("templates.deletedToast", { code: target.code }));
      setDeleting(null);
    } catch (error) {
      toast.error(apiErrorMessage(error, te));
    }
  };

  const columns = useMemo<ColumnDef<NotificationTemplateDto, unknown>[]>(
    () => [
      {
        id: "code",
        accessorFn: (template) => template.code,
        size: 150,
        header: t("templates.colCode"),
        cell: ({ row }) => <span className="block truncate font-medium">{row.original.code}</span>,
      },
      {
        id: "name",
        accessorFn: (template) => template.name,
        size: 200,
        header: t("templates.colName"),
        cell: ({ row }) => <span className="text-sm">{row.original.name}</span>,
      },
      {
        id: "channel",
        accessorFn: (template) => String(template.channel_id),
        size: 120,
        header: t("templates.colChannel"),
        meta: {
          filter: "select",
          filterLabel: t("templates.colChannel"),
          renderFilter: ({ value, setValue, searchLabel }) => (
            <ChannelFilter value={value} onChange={setValue} searchLabel={searchLabel} emptyLabel={tc("noResults")} />
          ),
        },
        cell: ({ row }) => <Chip>{channelName(row.original.channel_id)}</Chip>,
      },
      {
        id: "en",
        accessorFn: (template) => localizedText(template.body, "en"),
        size: 280,
        header: t("templates.colEn"),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="line-clamp-2 text-xs text-muted-foreground">
            {htmlToPlainText(row.original.body?.EN ?? "")}
          </span>
        ),
      },
      {
        id: "ar",
        accessorFn: (template) => localizedText(template.body, "ar"),
        size: 280,
        header: t("templates.colAr"),
        enableSorting: false,
        cell: ({ row }) => (
          <span dir="rtl" className="line-clamp-2 text-xs text-muted-foreground">
            {htmlToPlainText(row.original.body?.AR ?? "")}
          </span>
        ),
      },
      {
        id: "active",
        accessorFn: (template) => (template.is_active ? "1" : "0"),
        size: 100,
        header: t("templates.colActive"),
        meta: {
          filter: "select",
          filterOptions: [
            { value: "1", label: t("templates.active") },
            { value: "0", label: t("templates.inactive") },
          ],
          filterLabel: t("templates.colActive"),
        },
        cell: ({ row }) => (
          <StatusBadge tone={row.original.is_active ? "success" : "neutral"} equalWidth={false} className="min-w-[5.5rem]">
            {row.original.is_active ? t("templates.active") : t("templates.inactive")}
          </StatusBadge>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        size: 88,
        header: "",
        meta: { headClassName: "text-end", cellClassName: "text-end", noClip: true },
        cell: ({ row }) => {
          const template = row.original;
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
                        openEdit(template);
                      }}
                      aria-label={t("templates.edit")}
                    />
                  }
                >
                  <Pencil className="size-4" />
                </TooltipTrigger>
                <TooltipContent>{t("templates.edit")}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={(event) => {
                        event.stopPropagation();
                        setDeleting(template);
                      }}
                      aria-label={t("templates.delete")}
                      className="hover:bg-danger/10 hover:text-danger"
                    />
                  }
                >
                  <Trash2 className="size-4" />
                </TooltipTrigger>
                <TooltipContent>{t("templates.delete")}</TooltipContent>
              </Tooltip>
            </div>
          );
        },
      },
    ],
    [t, tc, channelName, openEdit],
  );

  return (
    <div className="mx-auto max-w-7xl">
      <Card>
        <CardHeader>
          <CardTitle>{t("templates.title")}</CardTitle>
          <CardDescription>{t("templates.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {templatesQuery.isError ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-sm text-muted-foreground">{t("templates.loadError")}</p>
              <Button variant="outline" size="sm" onClick={() => templatesQuery.refetch()}>
                {tc("retry")}
              </Button>
            </div>
          ) : templatesQuery.isPending ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={templates}
              pageSize={10}
              searchPlaceholder={t("templates.search")}
              emptyLabel={t("templates.empty")}
              itemsLabel={t("templates.items")}
              onRowClick={(template) => setDetail(template)}
              rowAriaLabel={(template) => template.code}
              getSearchText={(template) =>
                `${template.code} ${template.name} ${htmlToPlainText(template.body?.EN ?? "")} ${htmlToPlainText(
                  template.body?.AR ?? "",
                )}`
              }
              filterLabels={{
                filter: t("templates.filter"),
                clear: t("templates.clear"),
                clearFilters: tc("clearFilters"),
                search: t("templates.filterSearch"),
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
                        aria-label={t("templates.newTemplate")}
                        className={toolbarIconButtonClass}
                      />
                    }
                  >
                    <Plus className="size-4" />
                    <span className="hidden sm:inline">{t("templates.newTemplate")}</span>
                  </TooltipTrigger>
                  <TooltipContent>{t("templates.newTemplate")}</TooltipContent>
                </Tooltip>
              }
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogMode != null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "edit" ? t("templates.editTitle") : t("templates.createTitle")}
            </DialogTitle>
            <DialogDescription>{t("templates.editDesc")}</DialogDescription>
          </DialogHeader>
          <Form onSubmit={handleSubmit(onSubmit)}>
            <DialogBody className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={t("templates.codeLabel")}
                  htmlFor="tpl-code"
                  error={formState.errors.code?.message}
                  reserveMessage={false}
                >
                  <Input
                    id="tpl-code"
                    {...register("code")}
                    placeholder={t("templates.codePlaceholder")}
                    disabled={dialogMode === "edit"}
                    autoFocus={dialogMode === "create"}
                  />
                </Field>
                <Field
                  label={t("templates.nameLabel")}
                  htmlFor="tpl-name"
                  error={formState.errors.name?.message}
                  reserveMessage={false}
                >
                  <Input id="tpl-name" {...register("name")} placeholder={t("templates.namePlaceholder")} />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={t("templates.channelLabel")}
                  htmlFor="tpl-channel"
                  error={formState.errors.channelId?.message}
                  reserveMessage={false}
                >
                  <Controller
                    control={control}
                    name="channelId"
                    render={({ field }) => (
                      <ChannelSelect
                        id="tpl-channel"
                        ariaLabel={t("templates.channelLabel")}
                        value={field.value}
                        onChange={field.onChange}
                        selectedLabel={field.value ? channelName(Number(field.value)) : undefined}
                        placeholder={t("templates.channelPlaceholder")}
                        searchPlaceholder={tc("search")}
                        emptyLabel={tc("noResults")}
                      />
                    )}
                  />
                </Field>
                <Controller
                  control={control}
                  name="isActive"
                  render={({ field }) => (
                    <SwitchField
                      label={t("templates.statusLabel")}
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      checkedLabel={t("templates.active")}
                      uncheckedLabel={t("templates.inactive")}
                    />
                  )}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={t("templates.subjectEnLabel")}
                  htmlFor="tpl-subject-en"
                  error={formState.errors.subjectEn?.message}
                  reserveMessage={false}
                >
                  <Input id="tpl-subject-en" {...register("subjectEn")} placeholder={t("templates.subjectPlaceholder")} />
                </Field>
                <Field label={t("templates.subjectArLabel")} htmlFor="tpl-subject-ar" reserveMessage={false}>
                  <Input id="tpl-subject-ar" dir="rtl" {...register("subjectAr")} />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label>{t("templates.enLabel")}</Label>
                    <span className="text-xs text-muted-foreground tabular">
                      {t("templates.chars", { count: htmlToPlainText(bodyEnVal).length })}
                    </span>
                  </div>
                  <Controller
                    control={control}
                    name="bodyEn"
                    render={({ field }) => (
                      <RichTextEditor
                        value={field.value}
                        onChange={field.onChange}
                        ariaLabel={t("templates.enLabel")}
                        labels={editorLabels}
                        extraTools={(editor) => (
                          <VarInserter
                            label={t("templates.insertVariable")}
                            onInsert={(token) => editor.chain().focus().insertContent(`{${token}}`).run()}
                          />
                        )}
                      />
                    )}
                  />
                  {formState.errors.bodyEn && <FieldError>{formState.errors.bodyEn.message}</FieldError>}
                  {hasMergeVariable(bodyEnVal) && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">{t("templates.preview")}</span>
                      <div
                        className="rounded-lg border border-dashed bg-muted/20 p-2 text-sm"
                        dangerouslySetInnerHTML={{ __html: sanitizeTemplateHtml(renderTemplate(bodyEnVal, "en")) }}
                      />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label>{t("templates.arLabel")}</Label>
                    <span className="text-xs text-muted-foreground tabular">
                      {t("templates.chars", { count: htmlToPlainText(bodyArVal).length })}
                    </span>
                  </div>
                  <Controller
                    control={control}
                    name="bodyAr"
                    render={({ field }) => (
                      <RichTextEditor
                        value={field.value}
                        onChange={field.onChange}
                        dir="rtl"
                        ariaLabel={t("templates.arLabel")}
                        labels={editorLabels}
                        extraTools={(editor) => (
                          <VarInserter
                            label={t("templates.insertVariable")}
                            onInsert={(token) => editor.chain().focus().insertContent(`{${token}}`).run()}
                          />
                        )}
                      />
                    )}
                  />
                  {hasMergeVariable(bodyArVal) && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">{t("templates.preview")}</span>
                      <div
                        dir="rtl"
                        className="rounded-lg border border-dashed bg-muted/20 p-2 text-sm"
                        dangerouslySetInnerHTML={{ __html: sanitizeTemplateHtml(renderTemplate(bodyArVal, "ar")) }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </DialogBody>
          </Form>
          <DialogFooter layout="split">
            <Button variant="outline" size="lg" onClick={closeDialog}>
              {tc("cancel")}
            </Button>
            <Button
              size="lg"
              onClick={handleSubmit(onSubmit)}
              loading={createTemplate.isPending || updateTemplate.isPending}
              disabled={dialogMode === "edit" && !formState.isDirty}
            >
              {dialogMode === "edit" ? tc("save") : t("templates.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleting != null}
        onOpenChange={(open) => {
          if (!open && !deleteTemplate.isPending) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("templates.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting ? t("templates.deleteBody", { code: deleting.code }) : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter layout="split">
            <AlertDialogCancel disabled={deleteTemplate.isPending}>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              loading={deleteTemplate.isPending}
              className="bg-danger text-danger-foreground hover:bg-danger/90"
            >
              {t("templates.deleteConfirm")}
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
                <Chip>{channelName(shownDetail.channel_id)}</Chip>
                <StatusBadge tone={shownDetail.is_active ? "success" : "neutral"} equalWidth={false}>
                  {shownDetail.is_active ? t("templates.active") : t("templates.inactive")}
                </StatusBadge>
              </div>
            </SheetHeader>
            <SheetBody className="flex flex-col gap-4">
              {detailQuery.isError ? (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <p className="text-sm text-muted-foreground">{t("templates.detailLoadError")}</p>
                  <Button variant="outline" size="sm" onClick={() => detailQuery.refetch()}>
                    {tc("retry")}
                  </Button>
                </div>
              ) : detailQuery.isPending ? (
                <div className="flex flex-col gap-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-28 w-full" />
                </div>
              ) : (
                (() => {
                  const record = detailQuery.data;
                  const notSet = <span className="text-muted-foreground italic">{t("templates.notSet")}</span>;
                  return (
                    <>
                      <DetailList
                        items={[
                          { label: t("templates.colCode"), value: record.code },
                          { label: t("templates.colName"), value: record.name },
                          { label: t("templates.channelLabel"), value: channelName(record.channel_id) },
                          {
                            label: t("templates.colActive"),
                            value: record.is_active ? t("templates.active") : t("templates.inactive"),
                          },
                          { label: t("templates.subjectEnLabel"), value: record.subject?.EN || notSet },
                          { label: t("templates.subjectArLabel"), value: record.subject?.AR || notSet },
                          {
                            label: t("templates.colCreated"),
                            value: record.created_at
                              ? (() => {
                                  const { date, time } = fmtDateTimeParts(Date.parse(record.created_at), locale);
                                  return `${date} ${time}`;
                                })()
                              : notSet,
                          },
                        ]}
                      />
                      <div className="flex flex-col gap-2">
                        <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                          {t("templates.enLabel")}
                        </h4>
                        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                          {htmlToPlainText(record.body?.EN ?? "") ? (
                            <div
                              dangerouslySetInnerHTML={{
                                __html: sanitizeTemplateHtml(renderTemplate(record.body?.EN ?? "", "en")),
                              }}
                            />
                          ) : (
                            notSet
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                          {t("templates.arLabel")}
                        </h4>
                        <div dir="rtl" className="rounded-lg border bg-muted/30 p-3 text-sm">
                          {htmlToPlainText(record.body?.AR ?? "") ? (
                            <div
                              dangerouslySetInnerHTML={{
                                __html: sanitizeTemplateHtml(renderTemplate(record.body?.AR ?? "", "ar")),
                              }}
                            />
                          ) : (
                            notSet
                          )}
                        </div>
                      </div>
                    </>
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
                {t("templates.edit")}
              </Button>
            </SheetFooter>
          </SheetContent>
        )}
      </Sheet>
    </div>
  );
}
