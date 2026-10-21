"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Controller, useForm, useWatch, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { MinutesSelect, ParameterSection, TravelChoices, UnitInput, useParameterMessages } from "./calendar-parameter-fields";
import { useParameterValueLabel } from "@/lib/calendars/labels";
import { AsyncSelect, type AsyncOptionsResult } from "@/components/common/async-select";
import { Switch } from "@/components/common/toggle-switch";
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
import { Button } from "@/components/ui/button";
import { ButtonRow } from "@/components/ui/button-row";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { useHasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { useSpecialistStore, type Specialist } from "@/lib/specialists";
import {
  ANNUAL_NUMERIC_KEYS,
  ROLE_HAS_TRAVEL,
  ROLE_SUPPORTS_ONLINE,
  WEEKLY_NUMERIC_KEYS,
  resolveSpecialistParameters,
  specialistFormValues,
  specialistOverridesFrom,
  useCalendarParameters,
  type AnnualNumericKey,
  type WeeklyNumericKey,
} from "@/lib/calendars/parameters";
import { specialistParametersFormSchemaFor, type CountKey, type SpecialistParametersForm } from "@/lib/calendars/schemas";

const ROW_COLUMNS = "sm:grid-cols-[minmax(0,1fr)_11rem_5.5rem]";

export function SpecialistParametersEditor({ initialId }: { initialId?: string | null }) {
  const t = useTranslations("calendarSettings");
  const roleName = useTranslations("common.role");
  const specialists = useSpecialistStore((state) => state.specialists);
  const [selected, setSelected] = useState(initialId ?? specialists[0]?.id ?? "");
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const specialist = specialists.find((item) => item.id === selected);
  const choose = (id: string) => {
    if (id === specialist?.id) return;
    if (dirty) setPending(id);
    else setSelected(id);
  };
  const discardAndSwitch = () => {
    if (pending) setSelected(pending);
    setPending(null);
    setDirty(false);
  };
  const labelOf = (person: Specialist) => `${person.name} (${roleName(person.role)})`;
  const useSpecialistOptions = (search: string, enabled: boolean): AsyncOptionsResult => {
    const term = enabled ? search.trim().toLocaleLowerCase() : "";
    const options = specialists
      .map((person) => ({ value: person.id, label: labelOf(person) }))
      .filter((option) => option.label.toLocaleLowerCase().includes(term));
    return { options, isPending: false, hasNextPage: false, isFetchingNextPage: false, fetchNextPage: () => undefined };
  };

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="text-lg font-semibold">{t("specialistTitle")}</CardTitle>
        <CardDescription className="text-pretty">{t("specialistDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Field
          label={t("specialist")}
          htmlFor="calendar-parameters-specialist"
          reserveMessage={false}
          className="border-b pb-6"
        >
          <div className="sm:max-w-sm">
            <AsyncSelect
              id="calendar-parameters-specialist"
              value={specialist?.id ?? ""}
              onChange={choose}
              useOptions={useSpecialistOptions}
              selectedLabel={specialist ? labelOf(specialist) : undefined}
              placeholder={t("selectSpecialist")}
              searchPlaceholder={t("searchSpecialists")}
              emptyLabel={t("noSpecialistMatches")}
            />
          </div>
        </Field>
      </CardContent>
      {specialist ? (
        <SpecialistValues key={specialist.id} specialist={specialist} onDirtyChange={setDirty} />
      ) : (
        <CardContent>
          <p role="status" className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            {t(specialists.length ? "specialistNotFound" : "noSpecialists")}
          </p>
        </CardContent>
      )}
      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("leaveTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("leaveBody", { name: specialist?.name ?? "" })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter layout="split">
            <AlertDialogCancel>{t("leaveStay")}</AlertDialogCancel>
            <AlertDialogAction onClick={discardAndSwitch} className="bg-danger text-danger-foreground hover:bg-danger/90">
              {t("leaveConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function SpecialistValues({ specialist, onDirtyChange }: { specialist: Specialist; onDirtyChange: (dirty: boolean) => void }) {
  const t = useTranslations("calendarSettings");
  const valueLabel = useParameterValueLabel();
  const canEdit = useHasPermission(PERMISSIONS.TECHNICAL_EDIT);
  const global = useCalendarParameters((state) => state.parameters);
  const saved = useCalendarParameters((state) => state.specialistOverrides[specialist.id]);
  const customize = useCalendarParameters((state) => state.customize);
  const messages = useParameterMessages();
  const schema = useMemo(() => specialistParametersFormSchemaFor(messages), [messages]);
  const inherited = global[specialist.role];
  const loaded = useMemo(
    () => specialistFormValues(specialist.role, resolveSpecialistParameters(global, specialist.role, saved), saved),
    [global, specialist.role, saved],
  );
  const { control, register, reset, setValue, handleSubmit, formState } = useForm<SpecialistParametersForm>({
    resolver: zodResolver(schema),
    mode: "onSubmit",
    defaultValues: loaded,
  });
  const dirty = formState.isDirty;
  const custom = useWatch({ control, name: "custom" });
  const anyCustom = [...Object.values(custom.weekly), ...Object.values(custom.annual)].some(Boolean);
  const errors = formState.errors.values;

  useEffect(() => {
    if (!dirty) reset(loaded);
  }, [loaded, dirty, reset]);

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  const setWeeklyNumeric = (key: WeeklyNumericKey, enabled: boolean) => {
    setValue(`custom.weekly.${key}`, enabled, { shouldDirty: true });
    if (!enabled) setValue(`values.weekly.${key}`, inherited.weekly[key], { shouldDirty: true });
  };
  const setAnnualNumeric = (key: AnnualNumericKey, enabled: boolean) => {
    setValue(`custom.annual.${key}`, enabled, { shouldDirty: true });
    if (!enabled) setValue(`values.annual.${key}`, inherited.annual[key], { shouldDirty: true });
  };
  const setTravelTime = (enabled: boolean) => {
    setValue("custom.weekly.travelTime", enabled, { shouldDirty: true });
    if (!enabled) setValue("values.weekly.travelTime", inherited.weekly.travelTime, { shouldDirty: true });
  };
  const inheritAll = () => {
    WEEKLY_NUMERIC_KEYS.forEach((key) => {
      if (custom.weekly[key]) setWeeklyNumeric(key, false);
    });
    ANNUAL_NUMERIC_KEYS.forEach((key) => {
      if (custom.annual[key]) setAnnualNumeric(key, false);
    });
    if (custom.weekly.travelTime) setTravelTime(false);
  };

  const submit = handleSubmit((form) => {
    const overrides = specialistOverridesFrom(form);
    const check = schema.shape.values.safeParse(resolveSpecialistParameters(global, specialist.role, overrides));
    if (!check.success) {
      toast.error(t("specialistConflict", { message: check.error.issues[0]?.message ?? "" }));
      return;
    }
    try {
      customize(specialist.id, specialist.role, overrides);
    } catch {
      toast.error(t("specialistSaveFailed"));
      return;
    }
    reset(form);
    toast.success(t("specialistSaved"));
  });
  const onSave = () => {
    if (dirty) void submit();
  };

  const numberRow = ({
    id,
    key,
    error,
    globalValue,
    overridden,
    onOverride,
    control,
  }: {
    id: string;
    key: WeeklyNumericKey | AnnualNumericKey;
    error?: string;
    globalValue: number;
    overridden: boolean;
    onOverride: (enabled: boolean) => void;
    control: ReactNode;
  }) => (
    <OverrideRow
      key={id}
      id={id}
      label={t(`fields.${key}`)}
      caption={t("globalCaption", { value: valueLabel(key, globalValue) })}
      overrideLabel={t("overrideNamed", { rule: t(`fields.${key}`) })}
      overridden={overridden}
      onOverride={onOverride}
    >
      {control}
      {error && <FieldError>{error}</FieldError>}
    </OverrideRow>
  );
  const typedInput = (id: string, key: CountKey, registration: UseFormRegisterReturn, overridden: boolean, error?: string) => (
    <UnitInput id={id} parameter={key} disabled={!overridden} aria-invalid={Boolean(error)} {...registration} />
  );
  const weeklyRow = (key: WeeklyNumericKey) => {
    const id = `${specialist.id}-weekly-${key}`;
    const overridden = Boolean(custom.weekly[key]);
    const error = errors?.weekly?.[key]?.message;
    return numberRow({
      id,
      key,
      error,
      globalValue: inherited.weekly[key],
      overridden,
      onOverride: (enabled) => setWeeklyNumeric(key, enabled),
      control:
        key === "maxDaysOff" ? (
          typedInput(id, key, register("values.weekly.maxDaysOff", { valueAsNumber: true }), overridden, error)
        ) : (
          <Controller
            control={control}
            name={`values.weekly.${key}`}
            render={({ field }) => (
              <MinutesSelect id={id} value={field.value} onChange={field.onChange} disabled={!overridden} invalid={Boolean(error)} />
            )}
          />
        ),
    });
  };
  const annualRow = (key: AnnualNumericKey) => {
    const id = `${specialist.id}-annual-${key}`;
    const overridden = Boolean(custom.annual[key]);
    const error = errors?.annual?.[key]?.message;
    return numberRow({
      id,
      key,
      error,
      globalValue: inherited.annual[key],
      overridden,
      onOverride: (enabled) => setAnnualNumeric(key, enabled),
      control: typedInput(id, key, register(`values.annual.${key}`, { valueAsNumber: true }), overridden, error),
    });
  };

  return (
    <>
      <Form onSubmit={onSave}>
        <CardContent className="pt-2">
          <fieldset disabled={!canEdit} className="flex min-w-0 flex-col gap-6">
            <ParameterSection title={t("weekly")} hint={t("weeklyHint")}>
              <div>
                <RowHeader />
                <div className="flex flex-col divide-y">
                  {WEEKLY_NUMERIC_KEYS.filter((key) => key !== "minBlockOnlineMins" || ROLE_SUPPORTS_ONLINE[specialist.role]).map(weeklyRow)}
                  {ROLE_HAS_TRAVEL[specialist.role] && (
                    <Controller
                      control={control}
                      name="values.weekly.travelTime"
                      render={({ field }) => (
                        <OverrideRow
                          id={`${specialist.id}-weekly-travel`}
                          label={t("travelOptions")}
                          caption={t("globalCaption", { value: valueLabel("travelTime", inherited.weekly.travelTime) })}
                          overrideLabel={t("overrideNamed", { rule: t("travelOptions") })}
                          overridden={Boolean(custom.weekly.travelTime)}
                          onOverride={setTravelTime}
                        >
                          <TravelChoices
                            id={`${specialist.id}-weekly-travel`}
                            error={errors?.weekly?.travelTime?.options?.message}
                            value={field.value?.options ?? []}
                            onChange={(options) => field.onChange({ required: true, options })}
                            disabled={!custom.weekly.travelTime}
                            maxChips={1}
                          />
                          {errors?.weekly?.travelTime?.options?.message && (
                            <FieldError id={`${specialist.id}-weekly-travel-error`}>{errors.weekly.travelTime.options.message}</FieldError>
                          )}
                        </OverrideRow>
                      )}
                    />
                  )}
                </div>
              </div>
            </ParameterSection>

            <ParameterSection title={t("annual")} hint={t("annualHint")}>
              <div>
                <RowHeader />
                <div className="flex flex-col divide-y">
                  {ANNUAL_NUMERIC_KEYS.map(annualRow)}
                </div>
              </div>
            </ParameterSection>
          </fieldset>
        </CardContent>
      </Form>
      <CardFooter className="flex-col items-stretch gap-3 md:flex-row md:items-center">
        {!canEdit ? (
          <span role="status" className="text-xs text-muted-foreground">{t("readOnly")}</span>
        ) : errors ? (
          <FieldError>{t("correctErrors")}</FieldError>
        ) : (
          dirty && <span className="text-xs text-muted-foreground">{t("unsaved")}</span>
        )}
        <ButtonRow stackUntil="md" className="md:ms-auto">
          <Button variant="outline" size="lg" disabled={!canEdit || !anyCustom} onClick={inheritAll}>
            {t("inheritAll")}
          </Button>
          <Button size="lg" disabled={!canEdit || !dirty} onClick={onSave}>
            {t("saveSpecialist")}
          </Button>
        </ButtonRow>
      </CardFooter>
    </>
  );
}

function RowHeader() {
  const t = useTranslations("calendarSettings");
  return (
    <div className={`hidden gap-x-4 border-b pb-2 text-xs font-medium text-muted-foreground sm:grid ${ROW_COLUMNS}`}>
      <span>{t("rule")}</span>
      <span>{t("valueColumn")}</span>
      <span className="text-center">{t("overrideColumn")}</span>
    </div>
  );
}

function OverrideRow({
  id,
  label,
  caption,
  overrideLabel,
  overridden,
  onOverride,
  children,
}: {
  id?: string;
  label: string;
  caption: string;
  overrideLabel: string;
  overridden: boolean;
  onOverride: (enabled: boolean) => void;
  children: ReactNode;
}) {
  const t = useTranslations("calendarSettings");
  const Title = id ? "label" : "span";
  return (
    <div className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 py-3 ${ROW_COLUMNS}`}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <Title htmlFor={id} className="text-sm font-medium">
          {label}
        </Title>
        <span className="text-xs text-muted-foreground">{caption}</span>
      </div>
      <div className="col-span-2 row-start-2 flex flex-col gap-1 sm:col-span-1 sm:col-start-2 sm:row-start-1">{children}</div>
      <label className="col-start-2 row-start-1 flex items-center justify-end gap-2 text-xs text-muted-foreground has-[:disabled]:cursor-not-allowed sm:col-start-3 sm:justify-center">
        <span aria-hidden="true" className="sm:hidden">
          {t("overrideColumn")}
        </span>
        <Switch aria-label={overrideLabel} checked={overridden} onCheckedChange={onOverride} />
      </label>
    </div>
  );
}
