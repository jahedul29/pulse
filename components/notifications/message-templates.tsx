"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import { Braces, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, RequiredMark } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { TemplateBodyTools } from "@/components/notifications/template-body-tools";
import { TemplateIconGlyph, TemplatePreview } from "@/components/notifications/template-preview";
import { TEMPLATE_HTML_CLASS, TemplateHtml } from "@/components/notifications/template-html";
import { DataTable, toolbarIconButtonClass } from "@/components/common/data-table";
import { RecordDrawerHeader } from "@/components/common/record-drawer-header";
import { DateTimeValue } from "@/components/common/date-time-value";
import { DetailSection } from "@/components/common/detail-section";
import { useOrderedRows, useRecordPager } from "@/lib/use-record-pager";
import { recordHref } from "@/lib/record-links";
import { useRetained } from "@/lib/use-retained";
import { apiErrorMessage } from "@/lib/api/error-message";
import { MERGE_VARIABLES, htmlToPlainText } from "@/lib/notifications/variables";
import { TEMPLATE_BODY_MARKS } from "@/components/notifications/template-editor-marks";
import { templateSchema, type TemplateForm } from "@/lib/notifications/schemas";
import {
  EMPTY_TEMPLATE_FORM,
  isLegacyTemplate,
  templateCreateBody,
  templateToForm,
  templateType,
  templateUpdateBody,
} from "@/lib/notifications/templates";
import { TEMPLATE_ICONS, TEMPLATE_TYPES, isTemplateIcon, localizedText, type TemplateType } from "@/lib/notifications/dto";
import {
  useAllTemplates,
  useChannels,
  useCreateTemplate,
  useDeleteTemplate,
  useTemplate,
  useUpdateTemplate,
} from "@/lib/notifications/queries";
import type { NotificationTemplateDto } from "@/lib/notifications/dto";
import { PERMISSIONS, useHasPermission } from "@/lib/auth/permissions";
import { LoadError } from "@/components/common/load-error";
import { PageContainer } from "@/components/common/page-container";
import { columnWidth } from "@/lib/table/column-widths";

function VarInserter({ label, onInsert }: { label: string; onInsert: (token: string) => void }) {
  const t = useTranslations("notifications");
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button type="button" variant="ghost" size="xs" className="ms-auto gap-1 text-xs text-muted-foreground" />}
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

const ICON_NONE = "none";

const templateKey = (template: NotificationTemplateDto) => String(template.id);

export function MessageTemplates() {
  const t = useTranslations("notifications");
  const tc = useTranslations("common");
  const canEdit = useHasPermission(PERMISSIONS.NOTIFICATION_TEMPLATES_EDIT);
  const canViewChannels = useHasPermission(PERMISSIONS.NOTIFICATION_CHANNELS_VIEW);
  const canOpenForm = canEdit && canViewChannels;
  const te = useTranslations("apiErrors");
  const locale = useLocale();

  const templatesQuery = useAllTemplates();
  const channelsQuery = useChannels();
  const templates = useMemo(() => templatesQuery.data ?? [], [templatesQuery.data]);
  const channels = useMemo(() => channelsQuery.data ?? [], [channelsQuery.data]);
  const channelName = useMemo(() => {
    const map = new Map(channels.map((channel) => [channel.id, channel.name || channel.code]));
    return (id: number | null | undefined) => (id == null ? "-" : (map.get(id) ?? "-"));
  }, [channels]);

  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();

  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<NotificationTemplateDto | null>(null);
  const [deleting, setDeleting] = useState<NotificationTemplateDto | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [linkedId, setLinkedId] = useState<number | null>(() => Number(searchParams.get("open")) || null);
  const [detail, setDetail] = useState<NotificationTemplateDto | null>(null);
  const detailQuery = useTemplate(detail?.id ?? linkedId);
  const linkedDetail = linkedId != null && detail == null && detailQuery.data?.id === linkedId ? detailQuery.data : null;
  const shownDetail = useRetained(detail ?? linkedDetail);
  const closeDetail = () => {
    setDetail(null);
    if (linkedId == null) return;
    setLinkedId(null);
    router.replace("/admin/notifications/templates");
  };
  const activeTemplateId = detail ? String(detail.id) : linkedDetail ? String(linkedDetail.id) : null;
  const [orderedTemplates, setOrderedTemplateIds] = useOrderedRows(templates, templateKey);
  const pager = useRecordPager({
    rows: orderedTemplates,
    getId: templateKey,
    activeId: activeTemplateId,
    onSelect: setDetail,
  });

  const schema = useMemo(
    () =>
      templateSchema(
        {
          codeRequired: t("templates.codeRequired"),
          codeFormat: t("templates.codeFormat"),
          nameRequired: t("templates.nameRequired"),
          channelRequired: t("templates.channelRequired"),
          headerTitleRequired: t("templates.headerTitleRequired"),
          senderTooLong: t("templates.senderTooLong"),
          bodyRequired: t("templates.bodyRequired"),
          buttonLabelRequired: t("templates.buttonLabelRequired"),
        },
        { isCreate: dialogMode === "create" },
      ),
    [t, dialogMode],
  );

  const form = useForm<TemplateForm>({
    resolver: zodResolver(schema),
    mode: "onSubmit",
    defaultValues: EMPTY_TEMPLATE_FORM,
  });
  const { reset, register, control, handleSubmit, formState } = form;
  const bodyEnVal = useWatch({ control, name: "bodyEn" });
  const bodyArVal = useWatch({ control, name: "bodyAr" });
  const typeVal = useWatch({ control, name: "type" });
  const isNotification = typeVal === "NOTIFICATION";
  const iconName = useCallback(
    (icon: string) => (isTemplateIcon(icon) ? t(`templates.icon_${icon}`) : icon),
    [t],
  );

  const defaultChannelId = useMemo(() => (channels.length ? String(channels[0].id) : ""), [channels]);

  const openCreate = () => {
    reset({ ...EMPTY_TEMPLATE_FORM, channelId: defaultChannelId });
    setEditing(null);
    setDialogMode("create");
  };

  const openEdit = useCallback(
    (template: NotificationTemplateDto) => {
      reset(templateToForm(template));
      setEditing(template);
      setDialogMode("edit");
    },
    [reset],
  );

  const closeDialog = () => setDialogMode(null);

  const onSubmit = async (values: TemplateForm) => {
    if (createTemplate.isPending || updateTemplate.isPending) return;
    try {
      if (dialogMode === "edit" && editing) {
        await updateTemplate.mutateAsync({ id: editing.id, body: templateUpdateBody(values) });
        toast.success(t("templates.updatedToast"));
      } else {
        await createTemplate.mutateAsync(templateCreateBody(values));
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
        ...columnWidth("label"),
        header: t("templates.colCode"),
        cell: ({ row }) => <span className="block truncate font-medium">{row.original.code}</span>,
      },
      {
        id: "name",
        accessorFn: (template) => template.name,
        ...columnWidth("name"),
        header: t("templates.colName"),
        cell: ({ row }) => <span>{row.original.name}</span>,
      },
      {
        id: "type",
        accessorFn: (template) => templateType(template),
        size: 136,
        header: t("templates.colType"),
        meta: {
          filter: "select",
          filterOptions: TEMPLATE_TYPES.map((type) => ({ value: type, label: t(`templates.type_${type}`) })),
          filterLabel: t("templates.colType"),
        },
        cell: ({ row }) => (
          <Chip className="min-w-[7rem] justify-center">{t(`templates.type_${templateType(row.original)}`)}</Chip>
        ),
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
        ...columnWidth("text"),
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
        ...columnWidth("text"),
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
        size: 112,
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
                      focusableWhenDisabled
                      disabled={!canOpenForm}
                      aria-label={t("templates.edit")}
                    />
                  }
                >
                  <Pencil className="size-4" />
                </TooltipTrigger>
                <TooltipContent>{canOpenForm ? t("templates.edit") : tc("noPermission")}</TooltipContent>
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
                      focusableWhenDisabled
                      disabled={!canEdit}
                      aria-label={t("templates.delete")}
                      className="hover:bg-danger/10 hover:text-danger"
                    />
                  }
                >
                  <Trash2 className="size-4" />
                </TooltipTrigger>
                <TooltipContent>{canEdit ? t("templates.delete") : tc("noPermission")}</TooltipContent>
              </Tooltip>
            </div>
          );
        },
      },
    ],
    [t, tc, channelName, openEdit, canEdit, canOpenForm],
  );

  return (
    <PageContainer fill>
      <Card>
        <CardHeader>
          <CardTitle>{t("templates.title")}</CardTitle>
          <CardDescription>{t("templates.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {templatesQuery.isError ? (
            <LoadError error={templatesQuery.error} message={t("templates.loadError")} onRetry={() => templatesQuery.refetch()} />
          ) : templatesQuery.isPending ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : (
            <DataTable
              fill
              columns={columns}
              data={templates}
              pageSize={10}
              searchPlaceholder={t("templates.search")}
              emptyLabel={t("templates.empty")}
              itemsLabel={t("templates.items")}
              onRowClick={(template) => setDetail(template)}
              rowAriaLabel={(template) => template.code}
              getRowId={(template) => String(template.id)}
              activeRowId={activeTemplateId}
              onOrderedIdsChange={setOrderedTemplateIds}
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
                        focusableWhenDisabled
                        disabled={!canOpenForm}
                        aria-label={t("templates.newTemplate")}
                        className={toolbarIconButtonClass}
                      />
                    }
                  >
                    <Plus className="size-4" />
                    <span className="hidden sm:inline">{t("templates.newTemplate")}</span>
                  </TooltipTrigger>
                  <TooltipContent>{canOpenForm ? t("templates.newTemplate") : tc("noPermission")}</TooltipContent>
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
                  required={dialogMode === "create"}
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
                  required
                  htmlFor="tpl-name"
                  error={formState.errors.name?.message}
                  reserveMessage={false}
                >
                  <Input id="tpl-name" {...register("name")} placeholder={t("templates.namePlaceholder")} />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={t("templates.typeLabel")}
                  required
                  htmlFor="tpl-type"
                  hint={t(`templates.typeHint_${typeVal}`)}
                  reserveMessage={false}
                >
                  <Controller
                    control={control}
                    name="type"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(value) => field.onChange((value ?? "NOTIFICATION") as TemplateType)}
                      >
                        <SelectTrigger id="tpl-type" className="w-full">
                          <SelectValue>{(value) => (value ? t(`templates.type_${value as TemplateType}`) : "")}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {TEMPLATE_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {t(`templates.type_${type}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
                <Field
                  label={t("templates.channelLabel")}
                  required
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
              </div>
              {isNotification && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t("templates.iconLabel")} htmlFor="tpl-icon" reserveMessage={false}>
                      <Controller
                        control={control}
                        name="icon"
                        render={({ field }) => (
                          <Select
                            value={field.value || ICON_NONE}
                            onValueChange={(value) => field.onChange(!value || value === ICON_NONE ? "" : String(value))}
                          >
                            <SelectTrigger id="tpl-icon" className="w-full">
                              <SelectValue>
                                {(value) =>
                                  value && value !== ICON_NONE ? (
                                    <span className="flex items-center gap-2">
                                      <TemplateIconGlyph icon={String(value)} className="size-4 text-accent-foreground" />
                                      {iconName(String(value))}
                                    </span>
                                  ) : (
                                    t("templates.iconNone")
                                  )
                                }
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={ICON_NONE}>{t("templates.iconNone")}</SelectItem>
                              {TEMPLATE_ICONS.map((icon) => (
                                <SelectItem key={icon} value={icon}>
                                  <span className="flex items-center gap-2">
                                    <TemplateIconGlyph icon={icon} className="size-4 text-accent-foreground" />
                                    {iconName(icon)}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </Field>
                    <Field
                      label={t("templates.senderLabel")}
                      htmlFor="tpl-sender"
                      error={formState.errors.senderName?.message}
                      reserveMessage={false}
                    >
                      <Input id="tpl-sender" {...register("senderName")} />
                    </Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label={t("templates.headerTitleEnLabel")}
                      required
                      htmlFor="tpl-header-title-en"
                      hint={dialogMode === "edit" && editing && isLegacyTemplate(editing) ? t("templates.legacyHint") : undefined}
                      error={formState.errors.headerTitleEn?.message}
                      reserveMessage={false}
                    >
                      <Input id="tpl-header-title-en" {...register("headerTitleEn")} />
                    </Field>
                    <Field label={t("templates.headerTitleArLabel")} htmlFor="tpl-header-title-ar" reserveMessage={false}>
                      <Input id="tpl-header-title-ar" dir="rtl" {...register("headerTitleAr")} />
                    </Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t("templates.headerSubtitleEnLabel")} htmlFor="tpl-header-subtitle-en" reserveMessage={false}>
                      <Input id="tpl-header-subtitle-en" {...register("headerSubtitleEn")} />
                    </Field>
                    <Field label={t("templates.headerSubtitleArLabel")} htmlFor="tpl-header-subtitle-ar" reserveMessage={false}>
                      <Input id="tpl-header-subtitle-ar" dir="rtl" {...register("headerSubtitleAr")} />
                    </Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t("templates.subjectEnLabel")} htmlFor="tpl-subject-en" reserveMessage={false}>
                      <Input id="tpl-subject-en" {...register("subjectEn")} placeholder={t("templates.subjectPlaceholder")} />
                    </Field>
                    <Field label={t("templates.subjectArLabel")} htmlFor="tpl-subject-ar" reserveMessage={false}>
                      <Input id="tpl-subject-ar" dir="rtl" {...register("subjectAr")} />
                    </Field>
                  </div>
                </>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label>
                      <span>
                        {t("templates.enLabel")}
                        <RequiredMark />
                      </span>
                    </Label>
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
                        basicTools={false}
                        extensions={TEMPLATE_BODY_MARKS}
                        contentClassName={TEMPLATE_HTML_CLASS}
                        extraTools={(editor) => (
                          <>
                            <TemplateBodyTools editor={editor} />
                            <VarInserter
                              label={t("templates.insertVariable")}
                              onInsert={(token) => editor.chain().focus().insertContent(`{${token}}`).run()}
                            />
                          </>
                        )}
                      />
                    )}
                  />
                  {formState.errors.bodyEn && <FieldError>{formState.errors.bodyEn.message}</FieldError>}
                  {hasMergeVariable(bodyEnVal) && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">{t("templates.preview")}</span>
                      <TemplateHtml
                        html={bodyEnVal}
                        dir="ltr"
                        sample
                        className="rounded-lg border border-dashed bg-muted/20 p-2"
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
                        basicTools={false}
                        extensions={TEMPLATE_BODY_MARKS}
                        contentClassName={TEMPLATE_HTML_CLASS}
                        extraTools={(editor) => (
                          <>
                            <TemplateBodyTools editor={editor} />
                            <VarInserter
                              label={t("templates.insertVariable")}
                              onInsert={(token) => editor.chain().focus().insertContent(`{${token}}`).run()}
                            />
                          </>
                        )}
                      />
                    )}
                  />
                  {hasMergeVariable(bodyArVal) && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">{t("templates.preview")}</span>
                      <TemplateHtml
                        html={bodyArVal}
                        dir="rtl"
                        sample
                        className="rounded-lg border border-dashed bg-muted/20 p-2"
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={t("templates.buttonLabelEnLabel")}
                  required
                  htmlFor="tpl-button-en"
                  error={formState.errors.buttonLabelEn?.message}
                  reserveMessage={false}
                >
                  <Input id="tpl-button-en" {...register("buttonLabelEn")} />
                </Field>
                <Field label={t("templates.buttonLabelArLabel")} htmlFor="tpl-button-ar" reserveMessage={false}>
                  <Input id="tpl-button-ar" dir="rtl" {...register("buttonLabelAr")} />
                </Field>
              </div>
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

      <Sheet inspect open={detail != null || linkedId != null} onOpenChange={(open) => !open && closeDetail()}>
        {shownDetail && (
          <SheetContent showCloseButton={false} onSwipeNext={() => pager.step(1)} onSwipePrev={() => pager.step(-1)}>
            <RecordDrawerHeader
              pager={pager}
              link={recordHref("template", shownDetail.id)}
              title={shownDetail.name}
              subtitle={<span className="font-mono text-[13px]">{shownDetail.code}</span>}
              summary={[
                {
                  label: t("templates.colCreated"),
                  value: shownDetail.created_at ? (
                    <DateTimeValue epoch={Date.parse(shownDetail.created_at)} locale={locale} precise />
                  ) : (
                    t("templates.notSet")
                  ),
                },
                { label: t("templates.colType"), value: t(`templates.type_${templateType(shownDetail)}`) },
                {
                  label: t("templates.colActive"),
                  value: (
                    <StatusBadge tone={shownDetail.is_active ? "success" : "neutral"} equalWidth={false}>
                      {shownDetail.is_active ? t("templates.active") : t("templates.inactive")}
                    </StatusBadge>
                  ),
                },
              ]}
            />
            <SheetBody className="flex flex-col gap-2">
              {detailQuery.isError ? (
                <LoadError error={detailQuery.error} message={t("templates.detailLoadError")} onRetry={() => detailQuery.refetch()} />
              ) : detailQuery.isPending ? (
                <div className="flex flex-col gap-4">
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-28 w-full" />
                </div>
              ) : (
                (() => {
                  const record = detailQuery.data;
                  const notSet = <span className="font-normal text-muted-foreground italic">{t("templates.notSet")}</span>;
                  const notification = templateType(record) === "NOTIFICATION";
                  const preview = (language: "EN" | "AR") => (
                    <DetailSection title={language === "EN" ? t("templates.colEn") : t("templates.colAr")}>
                      <TemplatePreview template={record} language={language} />
                    </DetailSection>
                  );
                  return (
                    <>
                      <DetailSection title={t("templates.sectionDetails")}>
                        <DetailList
                          divided
                          items={[
                            { label: t("templates.colChannel"), value: channelName(record.channel_id) },
                            ...(notification
                              ? [
                                  {
                                    label: t("templates.detailIcon"),
                                    value: record.icon ? (
                                      <span className="flex items-center gap-2">
                                        <TemplateIconGlyph icon={record.icon} className="size-4 shrink-0 text-accent-foreground" />
                                        {iconName(record.icon)}
                                      </span>
                                    ) : (
                                      notSet
                                    ),
                                  },
                                ]
                              : []),
                          ]}
                        />
                      </DetailSection>
                      {preview("EN")}
                      {preview("AR")}
                    </>
                  );
                })()
              )}
            </SheetBody>
            {canEdit && (
              <SheetFooter>
                {canOpenForm ? (
                  <Button
                    size="lg"
                    disabled={detailQuery.isPending || detailQuery.isError}
                    onClick={() => {
                      const target = detailQuery.data ?? shownDetail;
                      closeDetail();
                      openEdit(target);
                    }}
                  >
                    {t("templates.edit")}
                  </Button>
                ) : (
                  <Tooltip>
                    <TooltipTrigger render={<Button size="lg" focusableWhenDisabled disabled />}>{t("templates.edit")}</TooltipTrigger>
                    <TooltipContent>{tc("noPermission")}</TooltipContent>
                  </Tooltip>
                )}
              </SheetFooter>
            )}
          </SheetContent>
        )}
      </Sheet>
    </PageContainer>
  );
}
