"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import { Braces, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
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
          {MERGE_VARIABLES.map((v) => (
            <button
              key={v.token}
              type="button"
              onClick={() => {
                onInsert(v.token);
                setOpen(false);
              }}
              className="flex flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-start transition-colors hover:bg-muted"
            >
              <span className="font-mono text-xs">{`{${v.token}}`}</span>
              <span className="text-xs text-muted-foreground">{t(`variables.${v.token}`)}</span>
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

  const templatesState = useNotificationStore((s) => s.templates);
  const upsertTemplate = useNotificationStore((s) => s.upsertTemplate);
  const deleteTemplate = useNotificationStore((s) => s.deleteTemplate);

  const [rows, setRows] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [baseline, setBaseline] = useState<MessageTemplate | null>(null);
  const [hydratedCode, setHydratedCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [category, setCategory] = useState<MessageCategory>("validation");
  const [en, setEn] = useState("");
  const [ar, setAr] = useState("");
  const [codeError, setCodeError] = useState("");
  const [deleting, setDeleting] = useState<MessageTemplate | null>(null);

  const detail = useRecordDetail(
    dialogMode === "edit" ? editingCode : null,
    fetchTemplateDetail,
  );

  if (dialogMode === "edit" && detail.data && hydratedCode !== detail.data.code) {
    const d = detail.data;
    setHydratedCode(d.code);
    setBaseline(d);
    setCode(d.code);
    setCategory(d.category);
    setEn(d.en);
    setAr(d.ar);
  }

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
  }, [templatesState]);

  const openCreate = () => {
    setDialogMode("create");
    setEditingCode(null);
    setBaseline(null);
    setHydratedCode(null);
    setCode("");
    setCategory("validation");
    setEn("");
    setAr("");
    setCodeError("");
  };

  const openEdit = (tpl: MessageTemplate) => {
    setDialogMode("edit");
    setEditingCode(tpl.code);
    setBaseline(null);
    setHydratedCode(null);
    setCode("");
    setCategory(tpl.category);
    setEn("");
    setAr("");
    setCodeError("");
  };

  const closeDialog = () => setDialogMode(null);

  const submitDialog = () => {
    const trimmed = code.trim();
    if (dialogMode === "create") {
      if (!trimmed) {
        setCodeError(t("templates.codeRequired"));
        return;
      }
      if (templatesState.some((x) => x.code === trimmed)) {
        setCodeError(t("templates.codeExists"));
        return;
      }
    }
    const finalCode = dialogMode === "edit" && editingCode ? editingCode : trimmed;
    upsertTemplate({ code: finalCode, category, en: en.trim(), ar: ar.trim(), updatedAt: Date.now() });
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

  const dirty =
    dialogMode === "create" ||
    (baseline != null &&
      (category !== baseline.category || en.trim() !== baseline.en || ar.trim() !== baseline.ar));

  const columns = useMemo<ColumnDef<MessageTemplate, unknown>[]>(
    () => [
      {
        id: "code",
        accessorFn: (r) => r.code,
        size: 220,
        header: t("templates.colCode"),
        cell: ({ row }) => <span className="font-medium">{row.original.code}</span>,
      },
      {
        id: "category",
        accessorFn: (r) => r.category,
        size: 150,
        header: t("templates.colCategory"),
        meta: {
          filter: "select",
          filterOptions: MESSAGE_CATEGORIES.map((c) => ({ value: c, label: t(`categories.${c}`) })),
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
        accessorFn: (r) => r.en,
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
        accessorFn: (r) => r.ar,
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
        accessorFn: (r) => r.updatedAt,
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
                      onClick={(e) => {
                        e.stopPropagation();
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
                      onClick={(e) => {
                        e.stopPropagation();
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
    [t, locale],
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
              onRowClick={(r) => openEdit(r)}
              rowAriaLabel={(r) => r.code}
              getSearchText={(r) => `${r.code} ${r.en} ${r.ar}`}
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

      <Dialog open={dialogMode != null} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "edit" ? t("templates.editTitle") : t("templates.createTitle")}
            </DialogTitle>
            <DialogDescription>{t("templates.editDesc")}</DialogDescription>
          </DialogHeader>
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
              <Field label={t("templates.codeLabel")} htmlFor="tpl-code" error={codeError} reserveMessage={false}>
                <Input
                  id="tpl-code"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    if (codeError) setCodeError("");
                  }}
                  placeholder={t("templates.codePlaceholder")}
                  disabled={dialogMode === "edit"}
                  autoFocus={dialogMode === "create"}
                />
              </Field>
              <Field label={t("templates.categoryLabel")} reserveMessage={false}>
                <Select value={category} onValueChange={(v) => setCategory((v ?? "validation") as MessageCategory)}>
                  <SelectTrigger className="w-full">
                    <SelectValue>{(v) => (v ? t(`categories.${v}`) : "")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {MESSAGE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {t(`categories.${c}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label>{t("templates.enLabel")}</Label>
                  <span className="text-xs text-muted-foreground tabular">
                    {t("templates.chars", { count: htmlToPlainText(en).length })}
                  </span>
                </div>
                <RichTextEditor
                  value={en}
                  onChange={setEn}
                  ariaLabel={t("templates.enLabel")}
                  labels={editorLabels}
                  extraTools={(editor) => (
                    <VarInserter
                      label={t("templates.insertVariable")}
                      onInsert={(tok) => editor.chain().focus().insertContent(`{${tok}}`).run()}
                    />
                  )}
                />
                <div className="rounded-lg border bg-muted/30 p-2 text-sm">
                  {htmlToPlainText(en) ? (
                    <div dangerouslySetInnerHTML={{ __html: sanitizeTemplateHtml(renderTemplate(en, "en")) }} />
                  ) : (
                    <span className="text-muted-foreground">{t("templates.previewEmpty")}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("templates.pushPreview")}: {htmlToPlainText(renderTemplate(en, "en")) || "—"}
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label>{t("templates.arLabel")}</Label>
                  <span className="text-xs text-muted-foreground tabular">
                    {t("templates.chars", { count: htmlToPlainText(ar).length })}
                  </span>
                </div>
                <RichTextEditor
                  value={ar}
                  onChange={setAr}
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
                <div dir="rtl" className="rounded-lg border bg-muted/30 p-2 text-sm">
                  {htmlToPlainText(ar) ? (
                    <div dangerouslySetInnerHTML={{ __html: sanitizeTemplateHtml(renderTemplate(ar, "ar")) }} />
                  ) : (
                    <span className="text-muted-foreground">{t("templates.previewEmpty")}</span>
                  )}
                </div>
                <p dir="rtl" className="text-xs text-muted-foreground">
                  {t("templates.pushPreview")}: {htmlToPlainText(renderTemplate(ar, "ar")) || "—"}
                </p>
              </div>
            </div>
              </>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" size="lg" onClick={closeDialog}>
              {tc("cancel")}
            </Button>
            {(dialogMode === "create" || (!detail.loading && !detail.error)) && (
              <Button size="lg" onClick={submitDialog} disabled={!dirty}>
                {dialogMode === "edit" ? tc("save") : t("templates.create")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting != null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("templates.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting ? t("templates.deleteBody", { code: deleting.code }) : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
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
