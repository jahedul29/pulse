"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { DataTable, toolbarIconButtonClass } from "@/components/common/data-table";
import { fmtDateTimeParts } from "@/lib/format";
import { useNotificationStore } from "@/lib/notifications/store";
import { fetchTemplates, fetchTemplateDetail } from "@/lib/notifications/api";
import { useRecordDetail } from "@/lib/use-record-detail";
import { MERGE_VARIABLES, htmlToPlainText, renderTemplate } from "@/lib/notifications/variables";
import { sanitizeTemplateHtml } from "@/lib/notifications/sanitize";
import { templateSchema, type TemplateForm } from "@/lib/notifications/schemas";
import { MESSAGE_CATEGORIES } from "@/lib/notifications/types";
import type { MessageCategory, MessageTemplate } from "@/lib/notifications/types";

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

export function MessageTemplates() {
  const t = useTranslations("notifications");
  const tc = useTranslations("common");
  const locale = useLocale();

  const templatesState = useNotificationStore((state) => state.templates);
  const upsertTemplate = useNotificationStore((state) => state.upsertTemplate);
  const deleteTemplate = useNotificationStore((state) => state.deleteTemplate);

  const [rows, setRows] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<MessageTemplate | null>(null);

  const detail = useRecordDetail(
    dialogMode === "edit" ? editingCode : null,
    fetchTemplateDetail,
  );

  const schema = useMemo(
    () =>
      templateSchema(
        {
          codeRequired: t("templates.codeRequired"),
          codeFormat: t("templates.codeFormat"),
          codeExists: t("templates.codeExists"),
          enRequired: t("templates.enRequired"),
          arRequired: t("templates.arRequired"),
        },
        { existingCodes: templatesState.map((x) => x.code), isCreate: dialogMode === "create" },
      ),
    [t, templatesState, dialogMode],
  );

  const form = useForm<TemplateForm>({
    resolver: zodResolver(schema),
    mode: "onSubmit",
    defaultValues: { code: "", category: "validation", en: "", ar: "" },
  });
  const { reset, register, control, handleSubmit, formState } = form;
  const enVal = useWatch({ control, name: "en" });
  const arVal = useWatch({ control, name: "ar" });

  useEffect(() => {
    if (dialogMode === "edit" && detail.data) {
      const data = detail.data;
      reset({ code: data.code, category: data.category, en: data.en, ar: data.ar });
    }
  }, [dialogMode, detail.data, reset]);

  const editorLabels = {
    bold: t("editor.bold"),
    italic: t("editor.italic"),
    alignLeft: t("editor.alignLeft"),
    alignCenter: t("editor.alignCenter"),
    alignRight: t("editor.alignRight"),
  };

  useEffect(() => {
    let active = true;
    fetchTemplates()
      .then((result) => {
        if (!active) return;
        setRows(result);
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
  }, [templatesState]);

  const openCreate = () => {
    reset({ code: "", category: "validation", en: "", ar: "" });
    setEditingCode(null);
    setDialogMode("create");
  };

  const openEdit = useCallback(
    (tpl: MessageTemplate) => {
      reset({ code: tpl.code, category: tpl.category, en: "", ar: "" });
      setEditingCode(tpl.code);
      setDialogMode("edit");
    },
    [reset],
  );

  const closeDialog = () => setDialogMode(null);

  const onSubmit = (values: TemplateForm) => {
    const finalCode = dialogMode === "edit" && editingCode ? editingCode : values.code;
    upsertTemplate({
      code: finalCode,
      category: values.category,
      en: values.en,
      ar: values.ar,
    });
    toast.success(
      dialogMode === "edit" ? t("templates.updatedToast") : t("templates.createdToast", { code: finalCode }),
    );
    closeDialog();
  };

  const confirmDelete = () => {
    if (!deleting) return;
    deleteTemplate(deleting.code);
    toast.success(t("templates.deletedToast", { code: deleting.code }));
    setDeleting(null);
  };

  const columns = useMemo<ColumnDef<MessageTemplate, unknown>[]>(
    () => [
      {
        id: "code",
        accessorFn: (template) => template.code,
        size: 220,
        header: t("templates.colCode"),
        cell: ({ row }) => <span className="font-medium">{row.original.code}</span>,
      },
      {
        id: "category",
        accessorFn: (template) => template.category,
        size: 150,
        header: t("templates.colCategory"),
        meta: {
          filter: "select",
          filterOptions: MESSAGE_CATEGORIES.map((category) => ({ value: category, label: t(`categories.${category}`) })),
          filterLabel: t("templates.colCategory"),
        },
        cell: ({ row }) => (
          <StatusBadge tone="neutral" equalWidth={false} className="min-w-[8.5rem]">
            {t(`categories.${row.original.category}`)}
          </StatusBadge>
        ),
      },
      {
        id: "en",
        accessorFn: (template) => template.en,
        size: 300,
        header: t("templates.colEn"),
        cell: ({ row }) => (
          <span className="line-clamp-2 text-xs text-muted-foreground">
            {htmlToPlainText(row.original.en)}
          </span>
        ),
      },
      {
        id: "ar",
        accessorFn: (template) => template.ar,
        size: 300,
        header: t("templates.colAr"),
        cell: ({ row }) => (
          <span dir="rtl" className="line-clamp-2 text-xs text-muted-foreground">
            {htmlToPlainText(row.original.ar)}
          </span>
        ),
      },
      {
        id: "updated",
        accessorFn: (template) => template.updatedAt,
        size: 130,
        header: t("templates.colUpdated"),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground tabular">
            {fmtDateTimeParts(row.original.updatedAt, locale).date}
          </span>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        size: 110,
        header: "",
        meta: { headClassName: "text-end", cellClassName: "text-end" },
        cell: ({ row }) => {
          const tpl = row.original;
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
                        openEdit(tpl);
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
                        setDeleting(tpl);
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
    [t, locale, openEdit],
  );

  return (
    <div className="mx-auto max-w-7xl">
      <Card>
        <CardHeader>
          <CardTitle>{t("templates.title")}</CardTitle>
          <CardDescription>{t("templates.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="py-16 text-center text-sm text-muted-foreground">{t("templates.loadError")}</p>
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
              searchPlaceholder={t("templates.search")}
              emptyLabel={t("templates.empty")}
              itemsLabel={t("templates.items")}
              onRowClick={(template) => openEdit(template)}
              rowAriaLabel={(template) => template.code}
              getSearchText={(template) => `${template.code} ${template.en} ${template.ar}`}
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
            {dialogMode === "edit" && detail.loading ? (
              <div className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Skeleton className="h-44 w-full" />
                  <Skeleton className="h-44 w-full" />
                </div>
              </div>
            ) : dialogMode === "edit" && detail.error ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <p className="text-sm text-muted-foreground">{t("templates.editLoadError")}</p>
                <Button variant="outline" size="sm" onClick={detail.reload}>
                  {tc("retry")}
                </Button>
              </div>
            ) : (
              <>
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
              <Field label={t("templates.categoryLabel")} reserveMessage={false}>
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) => field.onChange((value ?? "validation") as MessageCategory)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue>{(value) => (value ? t(`categories.${value}`) : "")}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {MESSAGE_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {t(`categories.${category}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label>{t("templates.enLabel")}</Label>
                  <span className="text-xs text-muted-foreground tabular">
                    {t("templates.chars", { count: htmlToPlainText(enVal).length })}
                  </span>
                </div>
                <Controller
                  control={control}
                  name="en"
                  render={({ field }) => (
                    <RichTextEditor
                      value={field.value}
                      onChange={field.onChange}
                      ariaLabel={t("templates.enLabel")}
                      labels={editorLabels}
                      extraTools={(editor) => (
                        <VarInserter
                          label={t("templates.insertVariable")}
                          onInsert={(tok) => editor.chain().focus().insertContent(`{${tok}}`).run()}
                        />
                      )}
                    />
                  )}
                />
                {formState.errors.en && <FieldError>{formState.errors.en.message}</FieldError>}
                <div className="rounded-lg border bg-muted/30 p-2 text-sm">
                  {htmlToPlainText(enVal) ? (
                    <div dangerouslySetInnerHTML={{ __html: sanitizeTemplateHtml(renderTemplate(enVal, "en")) }} />
                  ) : (
                    <span className="text-muted-foreground">{t("templates.previewEmpty")}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("templates.pushPreview")}: {htmlToPlainText(renderTemplate(enVal, "en")) || "—"}
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label>{t("templates.arLabel")}</Label>
                  <span className="text-xs text-muted-foreground tabular">
                    {t("templates.chars", { count: htmlToPlainText(arVal).length })}
                  </span>
                </div>
                <Controller
                  control={control}
                  name="ar"
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
                          onInsert={(tok) => editor.chain().focus().insertContent(`{${tok}}`).run()}
                        />
                      )}
                    />
                  )}
                />
                {formState.errors.ar && <FieldError>{formState.errors.ar.message}</FieldError>}
                <div dir="rtl" className="rounded-lg border bg-muted/30 p-2 text-sm">
                  {htmlToPlainText(arVal) ? (
                    <div dangerouslySetInnerHTML={{ __html: sanitizeTemplateHtml(renderTemplate(arVal, "ar")) }} />
                  ) : (
                    <span className="text-muted-foreground">{t("templates.previewEmpty")}</span>
                  )}
                </div>
                <p dir="rtl" className="text-xs text-muted-foreground">
                  {t("templates.pushPreview")}: {htmlToPlainText(renderTemplate(arVal, "ar")) || "—"}
                </p>
              </div>
            </div>
              </>
            )}
          </DialogBody>
          </Form>
          <DialogFooter layout="split">
            <Button variant="outline" size="lg" onClick={closeDialog}>
              {tc("cancel")}
            </Button>
            {(dialogMode === "create" || (!detail.loading && !detail.error)) && (
              <Button
                size="lg"
                onClick={handleSubmit(onSubmit)}
                disabled={dialogMode === "edit" && !formState.isDirty}
              >
                {dialogMode === "edit" ? tc("save") : t("templates.create")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting != null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("templates.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting ? t("templates.deleteBody", { code: deleting.code }) : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter layout="split">
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-danger text-danger-foreground hover:bg-danger/90"
            >
              {t("templates.deleteConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
