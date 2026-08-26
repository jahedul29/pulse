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
import { StatusBadge, StatusDot } from "@/components/common/status-badge";
import { DataTable } from "@/components/common/data-table";
import { useNotificationStore } from "@/lib/notifications/store";
import { fetchAlertRouting } from "@/lib/notifications/api";
import { useRetained } from "@/lib/use-retained";
import { urgencyTone } from "@/lib/notifications/tones";
import { RECIPIENT_ROLES, URGENCIES } from "@/lib/notifications/types";
import type { AlertRouting, Urgency } from "@/lib/notifications/types";

export function AlertRoutingEditor() {
  const t = useTranslations("notifications");
  const tc = useTranslations("common");

  const routingState = useNotificationStore((s) => s.routing);
  const setRouting = useNotificationStore((s) => s.setRouting);

  const [rows, setRows] = useState<AlertRouting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [draft, setDraft] = useState<AlertRouting | null>(null);
  const shownDraft = useRetained(draft);

  useEffect(() => {
    let active = true;
    fetchAlertRouting()
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
  }, [routingState]);

  const original = draft ? routingState.find((r) => r.eventId === draft.eventId) : null;
  const dirty = draft != null && original != null && JSON.stringify(draft) !== JSON.stringify(original);

  const saveDraft = () => {
    if (!draft) return;
    setRouting(draft);
    toast.success(t("routing.savedToast"));
    setDraft(null);
  };

  const columns = useMemo<ColumnDef<AlertRouting, unknown>[]>(
    () => [
      {
        id: "event",
        accessorFn: (r) => r.eventName,
        size: 220,
        header: t("routing.colEvent"),
        cell: ({ row }) => <span className="font-medium">{row.original.eventName}</span>,
      },
      {
        id: "recipients",
        enableSorting: false,
        accessorFn: (r) => Object.values(r.recipients).filter(Boolean).length,
        size: 140,
        header: t("routing.colRecipients"),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground tabular">
            {t("routing.recipientCount", {
              count: Object.values(row.original.recipients).filter(Boolean).length,
              total: RECIPIENT_ROLES.length,
            })}
          </span>
        ),
      },
      {
        id: "ticket",
        enableSorting: false,
        accessorFn: (r) => r.generatesTicket,
        size: 130,
        header: t("routing.colTicket"),
        meta: { headClassName: "text-center", cellClassName: "px-2!" },
        cell: ({ row }) => (
          <div
            className="flex h-8 items-center justify-center"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Switch
              checked={row.original.generatesTicket}
              onCheckedChange={(v) => setRouting({ ...row.original, generatesTicket: v })}
              aria-label={t("routing.colTicket")}
            />
          </div>
        ),
      },
      {
        id: "urgency",
        accessorFn: (r) => r.urgency,
        size: 130,
        header: t("routing.colUrgency"),
        meta: {
          filter: "select",
          filterOptions: URGENCIES.map((u) => ({ value: u, label: t(`urgency.${u}`) })),
          filterLabel: t("routing.colUrgency"),
        },
        cell: ({ row }) => (
          <StatusBadge tone={urgencyTone(row.original.urgency)} equalWidth={false} className="min-w-[5rem]">
            {t(`urgency.${row.original.urgency}`)}
          </StatusBadge>
        ),
      },
    ],
    [t, setRouting],
  );

  return (
    <div className="mx-auto max-w-7xl">
      <Card>
        <CardHeader>
          <CardTitle>{t("routing.title")}</CardTitle>
          <CardDescription>{t("routing.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="py-16 text-center text-sm text-muted-foreground">{t("routing.loadError")}</p>
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
              searchPlaceholder={t("routing.search")}
              emptyLabel={t("routing.empty")}
              itemsLabel={t("routing.items")}
              onRowClick={(r) => setDraft(r)}
              rowAriaLabel={(r) => r.eventName}
              getSearchText={(r) => r.eventName}
              filterLabels={{ filter: t("routing.filter"), clear: t("routing.clear"), clearFilters: tc("clearFilters") }}
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
              <SheetDescription>{t("routing.drawerHint")}</SheetDescription>
            </SheetHeader>
            <SheetBody className="flex flex-col gap-5">
              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {t("routing.colRecipients")}
                </h4>
                {RECIPIENT_ROLES.map((role) => (
                  <label key={role} className="flex items-center justify-between gap-3">
                    <span className="text-sm">{t(`roles.${role}`)}</span>
                    <Switch
                      checked={shownDraft.recipients[role]}
                      onCheckedChange={(v) =>
                        setDraft({ ...shownDraft, recipients: { ...shownDraft.recipients, [role]: v } })
                      }
                      aria-label={t(`roles.${role}`)}
                    />
                  </label>
                ))}
              </div>

              <label className="flex items-center justify-between gap-3 border-t pt-4">
                <span className="text-sm font-medium">{t("routing.generatesTicket")}</span>
                <Switch
                  checked={shownDraft.generatesTicket}
                  onCheckedChange={(v) => setDraft({ ...shownDraft, generatesTicket: v })}
                  aria-label={t("routing.generatesTicket")}
                />
              </label>

              <Field label={t("routing.colUrgency")} reserveMessage={false}>
                <Select
                  value={shownDraft.urgency}
                  onValueChange={(v) => setDraft({ ...shownDraft, urgency: (v ?? "low") as Urgency })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(v) =>
                        v ? (
                          <span className="flex items-center gap-2">
                            <StatusDot tone={urgencyTone(v as Urgency)} />
                            {t(`urgency.${v}`)}
                          </span>
                        ) : (
                          ""
                        )
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {URGENCIES.map((u) => (
                      <SelectItem key={u} value={u}>
                        <span className="flex items-center gap-2">
                          <StatusDot tone={urgencyTone(u)} />
                          {t(`urgency.${u}`)}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
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
