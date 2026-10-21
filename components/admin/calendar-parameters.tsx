"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Controller, useForm, useWatch, type FieldErrors, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { SpecialistParametersEditor } from "./specialist-calendar-parameters";
import { MinutesSelect, ParameterSection, TravelChoices, UnitInput, useParameterMessages } from "./calendar-parameter-fields";
import { Alert } from "@/components/ui/alert";
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
import { Button, buttonVariants } from "@/components/ui/button";
import { ButtonRow } from "@/components/ui/button-row";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PERMISSIONS, useHasPermission } from "@/lib/auth/permissions";
import { useIsClient } from "@/lib/use-is-client";
import {
  ANNUAL_NUMERIC_KEYS,
  ROLE_HAS_TRAVEL,
  ROLE_SUPPORTS_ONLINE,
  defaultCalendarParameters,
  overridesInConflict,
  sameParameters,
  useCalendarParameters,
  type AnnualNumericKey,
  type CalendarParameters,
  type WeeklyMinutesKey,
  type WeeklyNumericKey,
} from "@/lib/calendars/parameters";
import { calendarParametersSchemaFor, type CountKey } from "@/lib/calendars/schemas";
import { fmtList } from "@/lib/format";
import { useSpecialistStore, type SpecialistType } from "@/lib/specialists";
import { cn } from "@/lib/utils";
import { PageContainer } from "@/components/common/page-container";

const ROLES: SpecialistType[] = ["therapist", "analyst"];

export function CalendarParametersEditor() {
  const t = useTranslations("calendarSettings");
  const ready = useIsClient();
  const canViewSpecialists = useHasPermission(PERMISSIONS.SPECIALISTS_VIEW);
  const searchParams = useSearchParams();
  const specialistId = canViewSpecialists ? searchParams.get("specialist") : null;
  const loading = (
    <div role="status" className="flex flex-col gap-4">
      <span className="sr-only">{t("loading")}</span>
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
  return (
    <PageContainer variant="form" className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground text-pretty">{t("subtitle")}</p>
      </header>
      <Alert role="note" title={t("storageTitle")}>
        {t("mockNotice")}
      </Alert>
      <Tabs defaultValue={specialistId ? "specialist" : "global"} className="gap-4">
        <TabsList variant="line" className="max-w-full">
          <TabsTrigger value="global">{t("globalLevel")}</TabsTrigger>
          {canViewSpecialists && <TabsTrigger value="specialist">{t("specialistLevel")}</TabsTrigger>}
        </TabsList>
        <TabsContent value="global" keepMounted>
          {ready ? <GlobalParametersForm /> : loading}
        </TabsContent>
        {canViewSpecialists && (
          <TabsContent value="specialist" keepMounted>
            {ready ? <SpecialistParametersEditor initialId={specialistId} /> : loading}
          </TabsContent>
        )}
      </Tabs>
    </PageContainer>
  );
}

function firstInvalidRole(errors: FieldErrors<CalendarParameters>): SpecialistType | undefined {
  return ROLES.find((role) => errors[role]);
}

function GlobalParametersForm() {
  const t = useTranslations("calendarSettings");
  const roleName = useTranslations("common.role");
  const applied = useCalendarParameters((state) => state.parameters);
  const apply = useCalendarParameters((state) => state.apply);
  const canEdit = useHasPermission(PERMISSIONS.TECHNICAL_EDIT);
  const [role, setRole] = useState<SpecialistType>("therapist");
  const [pendingApply, setPendingApply] = useState<{ values: CalendarParameters; conflicts: string[] } | null>(null);
  const specialists = useSpecialistStore((state) => state.specialists);
  const locale = useLocale();
  const messages = useParameterMessages();
  const schema = useMemo(() => calendarParametersSchemaFor(messages), [messages]);
  const defaults = useMemo(() => defaultCalendarParameters(), []);
  const { control, register, reset, resetField, setValue, clearErrors, handleSubmit, formState } = useForm<CalendarParameters>({
    resolver: zodResolver(schema),
    mode: "onSubmit",
    defaultValues: applied,
  });
  const dirty = formState.isDirty;
  const draft = useWatch({ control });
  const roleDirty = (kind: SpecialistType) => !sameParameters(draft[kind], formState.defaultValues?.[kind]);
  const atDefaults = sameParameters(draft[role], defaults[role]);
  const roleErrors = formState.errors[role];
  const hasErrors = Object.keys(formState.errors).length > 0;

  useEffect(() => {
    if (!dirty) reset(applied);
  }, [applied, dirty, reset]);

  const commit = (values: CalendarParameters) => {
    apply(values);
    reset(values);
    setPendingApply(null);
    toast.success(t("saved"));
  };
  const submit = handleSubmit(
    (values) => {
      const conflicts = overridesInConflict(values, useCalendarParameters.getState().specialistOverrides);
      if (conflicts.length) setPendingApply({ values, conflicts });
      else commit(values);
    },
    (errors) => {
      const invalid = firstInvalidRole(errors);
      if (invalid && !errors[role]) setRole(invalid);
    },
  );
  const onApply = () => {
    if (dirty) void submit();
  };
  const conflictNames = fmtList(
    (pendingApply?.conflicts ?? []).map((id) => specialists.find((person) => person.id === id)?.name ?? id),
    locale,
  );

  const numberField = (
    key: WeeklyNumericKey | AnnualNumericKey,
    error: string | undefined,
    hint: string | undefined,
    control: (id: string) => ReactNode,
  ) => {
    const id = `global-${role}-${key}`;
    return (
      <Field key={id} label={t(`fields.${key}`)} htmlFor={id} required hint={hint} error={error} reserveMessage={false}>
        {control(id)}
      </Field>
    );
  };
  const typedField = (key: CountKey, registration: UseFormRegisterReturn, error?: string) =>
    numberField(key, error, undefined, (id) => (
      <UnitInput id={id} parameter={key} aria-invalid={Boolean(error)} {...registration} />
    ));
  const minutesField = (key: WeeklyMinutesKey, hint?: string) => {
    const error = roleErrors?.weekly?.[key]?.message;
    return numberField(key, error, hint, (id) => (
      <Controller
        control={control}
        name={`${role}.weekly.${key}`}
        render={({ field }) => (
          <MinutesSelect id={id} value={field.value} onChange={field.onChange} invalid={Boolean(error)} />
        )}
      />
    ));
  };
  const annualField = (key: AnnualNumericKey) =>
    typedField(key, register(`${role}.annual.${key}`, { valueAsNumber: true }), roleErrors?.annual?.[key]?.message);

  return (
    <div className="flex flex-col gap-6">
      <Tabs value={role} onValueChange={(value) => setRole(value as SpecialistType)} className="gap-0">
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-lg font-semibold">{t("roleDefaultsTitle", { role: roleName(role) })}</CardTitle>
            <CardDescription>{t("roleDefaultsDescription")}</CardDescription>
            <CardAction>
              <TabsList aria-label={t("roleTabs")}>
                {ROLES.map((kind) => (
                  <TabsTrigger key={kind} value={kind} className="px-3">
                    {roleName(kind)}
                    {roleDirty(kind) && (
                      <>
                        <span aria-hidden className="size-1.5 rounded-full bg-primary" />
                        <span className="sr-only">{t("unsaved")}</span>
                      </>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </CardAction>
          </CardHeader>
          <Form onSubmit={onApply}>
            <CardContent>
              {ROLES.map((kind) => (
                <TabsContent key={kind} value={kind}>
                  {kind === role && (
                    <fieldset key={role} disabled={!canEdit} className="flex min-w-0 flex-col gap-6">
                      <ParameterSection title={t("weekly")} hint={t("weeklyHint")}>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {minutesField("minBlockInPersonMins")}
                          {ROLE_SUPPORTS_ONLINE[role] && minutesField("minBlockOnlineMins")}
                          {minutesField("minBreakMins", ROLE_HAS_TRAVEL[role] ? t("minBreakTravelHint") : undefined)}
                          {minutesField("continuousWindowMins")}
                          {typedField(
                            "maxDaysOff",
                            register(`${role}.weekly.maxDaysOff`, { valueAsNumber: true }),
                            roleErrors?.weekly?.maxDaysOff?.message,
                          )}
                          {minutesField("minAdjacentUnavailMins")}
                        </div>
                      </ParameterSection>

                      {ROLE_HAS_TRAVEL[role] && (
                        <ParameterSection title={t("travel")} hint={t("travelHint")}>
                          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <Controller
                              control={control}
                              name={`${role}.weekly.travelTime`}
                              render={({ field }) => (
                                <Field
                                  label={t("travelOptions")}
                                  htmlFor={`global-${role}-travel`}
                                  required
                                  error={roleErrors?.weekly?.travelTime?.options?.message}
                                  reserveMessage={false}
                                  className="min-w-0 sm:col-span-2"
                                >
                                  <TravelChoices
                                    id={`global-${role}-travel`}
                                    error={roleErrors?.weekly?.travelTime?.options?.message}
                                    value={field.value?.options ?? []}
                                    onChange={(options) => field.onChange({ required: true, options })}
                                  />
                                </Field>
                              )}
                            />
                          </div>
                        </ParameterSection>
                      )}

                      <ParameterSection title={t("annual")} hint={t("annualHint")}>
                        <div className="grid gap-4 sm:grid-cols-3">
                          {ANNUAL_NUMERIC_KEYS.map(annualField)}
                        </div>
                      </ParameterSection>
                    </fieldset>
                  )}
                </TabsContent>
              ))}
            </CardContent>
          </Form>
          <CardFooter className="flex-col items-stretch gap-3 md:flex-row md:items-center">
            {!canEdit ? (
              <span role="status" className="text-xs text-muted-foreground">{t("readOnly")}</span>
            ) : hasErrors ? (
              <FieldError>{t("correctErrors")}</FieldError>
            ) : (
              dirty && <span className="text-xs text-muted-foreground">{t("unsaved")}</span>
            )}
            <ButtonRow stackUntil="md" className="md:ms-auto">
              <Button
                variant="outline"
                size="lg"
                disabled={!canEdit || atDefaults}
                onClick={() => {
                  setValue(role, defaults[role], { shouldDirty: true });
                  clearErrors(role);
                }}
              >
                {t("defaults")}
              </Button>
              <Button variant="secondary" size="lg" disabled={!canEdit || !roleDirty(role)} onClick={() => resetField(role)}>
                {t("discard")}
              </Button>
              <Button size="lg" disabled={!canEdit || !dirty} onClick={onApply}>
                {t("apply")}
              </Button>
            </ButtonRow>
          </CardFooter>
        </Card>
      </Tabs>

      <AlertDialog
        open={pendingApply !== null}
        onOpenChange={(open) => {
          if (!open) setPendingApply(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("applyConflictTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("applyConflictBody", { names: conflictNames })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter layout="split">
            <AlertDialogCancel>{t("applyConflictCancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingApply && commit(pendingApply.values)}>{t("applyConflictConfirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
          <CardTitle>{t("testTitle")}</CardTitle>
          <CardDescription>{t("testDescription", { role: roleName(role) })}</CardDescription>
        </CardHeader>
        <CardContent>
          <ButtonRow>
            {[
              { href: `/demo/${role}`, label: t("openWeekly") },
              { href: `/demo/${role}/annual`, label: t("openAnnual") },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
              >
                {link.label}
                <ExternalLink data-icon="inline-end" aria-hidden className="rtl:-scale-x-100" />
                <span className="sr-only">{t("opensInNewTab")}</span>
              </Link>
            ))}
          </ButtonRow>
        </CardContent>
      </Card>
    </div>
  );
}
