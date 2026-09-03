"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
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
import { mappingSchema, type MappingForm } from "@/lib/notifications/schemas";
import { RECIPIENT_ROLES } from "@/lib/notifications/types";
import type { EventMapping } from "@/lib/notifications/types";

const EMPTY_MAPPING: MappingForm = {
  eventId: "",
  eventName: "",
  recipients: { client: false, rbt: false, sltot: false, bcba: false },
  templateByRole: {},
};

export function EdrMapping() {
  const t = useTranslations("notifications");
  const tc = useTranslations("common");

  const mappingsState = useNotificationStore((state) => state.mappings);
  const templatesState = useNotificationStore((state) => state.templates);
  const setMapping = useNotificationStore((state) => state.setMapping);

  const [rows, setRows] = useState<EventMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState<EventMapping | null>(null);
  const shown = useRetained(editing);

  const schema = useMemo(
    () => mappingSchema({ templateRequired: t("mapping.templateRequired") }),
    [t],
  );
  const form = useForm<MappingForm>({
    resolver: zodResolver(schema),
    mode: "onSubmit",
    defaultValues: EMPTY_MAPPING,
  });
  const { control, handleSubmit, reset, setValue, formState } = form;
  const recipientsVal = useWatch({ control, name: "recipients" });

  const openMapping = (mapping: EventMapping) => {
    reset({
      eventId: mapping.eventId,
      eventName: mapping.eventName,
      recipients: mapping.recipients,
      templateByRole: { ...mapping.templateByRole },
    });
    setEditing(mapping);
  };

  useEffect(() => {
    let active = true;
    fetchEventMappings()
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
  }, [mappingsState]);

  const templateOptions = useMemo(
    () => [...templatesState].map((tpl) => tpl.code).sort((codeA, codeB) => codeA.localeCompare(codeB)),
    [templatesState],
  );

  const onSubmit = (values: MappingForm) => {
    const templateByRole: EventMapping["templateByRole"] = {};
    for (const role of RECIPIENT_ROLES) {
      const tpl = values.templateByRole[role];
      if (values.recipients[role] && tpl) templateByRole[role] = tpl;
    }
    setMapping({
      eventId: values.eventId,
      eventName: values.eventName,
      recipients: values.recipients,
      templateByRole,
    });
    toast.success(t("mapping.savedToast"));
    setEditing(null);
  };

  const columns = useMemo<ColumnDef<EventMapping, unknown>[]>(() => {
    const roleColumns: ColumnDef<EventMapping, unknown>[] = RECIPIENT_ROLES.map((role) => ({
      id: role,
      enableSorting: false,
      accessorFn: (mapping) => mapping.recipients[role],
      size: 130,
      header: t(`roles.${role}`),
      meta: { headClassName: "text-center", cellClassName: "px-2!" },
      cell: ({ row }) => (
        <div
          className="flex h-8 items-center justify-center"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
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
        accessorFn: (mapping) => mapping.eventName,
        size: 240,
        header: t("mapping.colEvent"),
        cell: ({ row }) => <span className="font-medium">{row.original.eventName}</span>,
      },
      ...roleColumns,
      {
        id: "templates",
        enableSorting: false,
        accessorFn: (mapping) => Object.keys(mapping.templateByRole).length,
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
              onRowClick={(mapping) => openMapping(mapping)}
              rowAriaLabel={(mapping) => mapping.eventName}
              getSearchText={(mapping) => mapping.eventName}
              filterLabels={{ filter: t("mapping.filter"), clear: t("mapping.clear"), clearFilters: tc("clearFilters") }}
              enableFreeze
              maxFreeze={1}
            />
          )}
        </CardContent>
      </Card>

      <Sheet open={editing != null} onOpenChange={(open) => !open && setEditing(null)}>
        {shown && (
          <SheetContent>
            <SheetHeader>
              <SheetTitle>{shown.eventName}</SheetTitle>
              <SheetDescription>{t("mapping.drawerHint")}</SheetDescription>
            </SheetHeader>
            <Form onSubmit={handleSubmit(onSubmit)}>
            <SheetBody className="flex flex-col gap-5">
              {RECIPIENT_ROLES.map((role) => {
                const notifies = recipientsVal?.[role] ?? false;
                return (
                  <div key={role} className="flex flex-col gap-2 border-b pb-4 last:border-b-0">
                    <label className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">{t(`roles.${role}`)}</span>
                      <Controller
                        control={control}
                        name={`recipients.${role}`}
                        render={({ field }) => (
                          <Switch
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              if (!checked) setValue(`templateByRole.${role}`, undefined, { shouldDirty: true });
                            }}
                            aria-label={t(`roles.${role}`)}
                          />
                        )}
                      />
                    </label>
                    <Field
                      label={t("mapping.templateLabel")}
                      error={formState.errors.templateByRole?.[role]?.message}
                      reserveMessage={false}
                    >
                      <Controller
                        control={control}
                        name={`templateByRole.${role}`}
                        render={({ field }) => (
                          <Select
                            value={field.value ?? ""}
                            onValueChange={(value) => field.onChange(value ?? undefined)}
                            disabled={!notifies}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue>{(value) => (value ? String(value) : t("mapping.noTemplate"))}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {templateOptions.map((code) => (
                                <SelectItem key={code} value={code}>
                                  {code}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </Field>
                  </div>
                );
              })}
            </SheetBody>
            </Form>
            <SheetFooter layout="split">
              <Button variant="outline" size="lg" onClick={() => setEditing(null)}>
                {tc("cancel")}
              </Button>
              <Button size="lg" onClick={handleSubmit(onSubmit)} disabled={!formState.isDirty}>
                {tc("save")}
              </Button>
            </SheetFooter>
          </SheetContent>
        )}
      </Sheet>
    </div>
  );
}
