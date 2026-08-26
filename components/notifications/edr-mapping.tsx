"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/common/toggle-switch";
import { DataTable } from "@/components/common/data-table";
import { useNotificationStore } from "@/lib/notifications/store";
import { fetchEventMappings } from "@/lib/notifications/api";
import { useRetained } from "@/lib/use-retained";
import { RECIPIENT_ROLES } from "@/lib/notifications/types";
import type { EventMapping } from "@/lib/notifications/types";

export function EdrMapping() {
  const t = useTranslations("notifications");
  const tc = useTranslations("common");

  const mappingsState = useNotificationStore((s) => s.mappings);
  const templatesState = useNotificationStore((s) => s.templates);
  const setMapping = useNotificationStore((s) => s.setMapping);

  const [rows, setRows] = useState<EventMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [draft, setDraft] = useState<EventMapping | null>(null);
  const shownDraft = useRetained(draft);

  useEffect(() => {
    let active = true;
    fetchEventMappings()
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
  }, [mappingsState]);

  const templateOptions = useMemo(
    () => [...templatesState].map((tpl) => tpl.code).sort((a, b) => a.localeCompare(b)),
    [templatesState],
  );

  const original = draft ? mappingsState.find((m) => m.eventId === draft.eventId) : null;
  const dirty = draft != null && original != null && JSON.stringify(draft) !== JSON.stringify(original);

  const saveDraft = () => {
    if (!draft) return;
    setMapping(draft);
    toast.success(t("mapping.savedToast"));
    setDraft(null);
  };

  const columns = useMemo<ColumnDef<EventMapping, unknown>[]>(() => {
    const roleColumns: ColumnDef<EventMapping, unknown>[] = RECIPIENT_ROLES.map((role) => ({
      id: role,
      enableSorting: false,
      accessorFn: (r) => r.recipients[role],
      size: 130,
      header: t(`roles.${role}`),
      meta: { headClassName: "text-center", cellClassName: "px-2!" },
      cell: ({ row }) => (
        <div
          className="flex h-8 items-center justify-center"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Switch
            checked={row.original.recipients[role]}
            onCheckedChange={() =>
              setMapping({
                ...row.original,
                recipients: { ...row.original.recipients, [role]: !row.original.recipients[role] },
              })
            }
            aria-label={`${row.original.eventName} · ${t(`roles.${role}`)}`}
          />
        </div>
      ),
    }));
    return [
      {
        id: "event",
        accessorFn: (r) => r.eventName,
        size: 240,
        header: t("mapping.colEvent"),
        cell: ({ row }) => <span className="font-medium">{row.original.eventName}</span>,
      },
      ...roleColumns,
      {
        id: "templates",
        enableSorting: false,
        accessorFn: (r) => Object.keys(r.templateByRole).length,
        size: 150,
        header: t("mapping.colTemplates"),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground tabular">
            {t("mapping.templatesSet", { count: Object.keys(row.original.templateByRole).length })}
          </span>
        ),
      },
    ];
  }, [t, setMapping]);

  return (
    <div className="mx-auto max-w-7xl">
      <Card>
        <CardHeader>
          <CardTitle>{t("mapping.title")}</CardTitle>
          <CardDescription>{t("mapping.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="py-16 text-center text-sm text-muted-foreground">{t("mapping.loadError")}</p>
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
              searchPlaceholder={t("mapping.search")}
              emptyLabel={t("mapping.empty")}
              itemsLabel={t("mapping.items")}
              onRowClick={(r) => setDraft(r)}
              rowAriaLabel={(r) => r.eventName}
              getSearchText={(r) => r.eventName}
              filterLabels={{ filter: t("mapping.filter"), clear: t("mapping.clear"), clearFilters: tc("clearFilters") }}
              enableFreeze
              maxFreeze={1}
            />
          )}
        </CardContent>
      </Card>

      <Sheet open={draft != null} onOpenChange={(o) => !o && setDraft(null)}>
        {shownDraft && (
          <SheetContent>
            <SheetHeader>
              <SheetTitle>{shownDraft.eventName}</SheetTitle>
              <SheetDescription>{t("mapping.drawerHint")}</SheetDescription>
            </SheetHeader>
            <SheetBody className="flex flex-col gap-5">
              {RECIPIENT_ROLES.map((role) => {
                const notifies = shownDraft.recipients[role];
                return (
                  <div key={role} className="flex flex-col gap-2 border-b pb-4 last:border-b-0">
                    <label className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">{t(`roles.${role}`)}</span>
                      <Switch
                        checked={notifies}
                        onCheckedChange={(v) => {
                          const templateByRole = { ...shownDraft.templateByRole };
                          if (!v) delete templateByRole[role];
                          setDraft({
                            ...shownDraft,
                            recipients: { ...shownDraft.recipients, [role]: v },
                            templateByRole,
                          });
                        }}
                        aria-label={t(`roles.${role}`)}
                      />
                    </label>
                    <Field label={t("mapping.templateLabel")} reserveMessage={false}>
                      <Select
                        value={shownDraft.templateByRole[role] ?? ""}
                        onValueChange={(v) =>
                          setDraft({
                            ...shownDraft,
                            templateByRole: { ...shownDraft.templateByRole, [role]: v ?? undefined },
                          })
                        }
                        disabled={!notifies}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue>{(v) => (v ? String(v) : t("mapping.noTemplate"))}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {templateOptions.map((code) => (
                            <SelectItem key={code} value={code}>
                              {code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                );
              })}
            </SheetBody>
            <SheetFooter layout="split">
              <Button variant="outline" size="lg" onClick={() => setDraft(null)}>
                {tc("cancel")}
              </Button>
              <Button size="lg" onClick={saveDraft} disabled={!dirty}>
                {tc("save")}
              </Button>
            </SheetFooter>
          </SheetContent>
        )}
      </Sheet>
    </div>
  );
}
