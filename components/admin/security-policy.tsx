"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ButtonRow } from "@/components/ui/button-row";
import { Form } from "@/components/ui/form";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/common/toggle-switch";
import { StatusBadge } from "@/components/common/status-badge";
import { DetailList } from "@/components/common/detail-list";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fmtDateTimeParts } from "@/lib/format";
import { apiErrorMessage } from "@/lib/api/error-message";
import { useCurrentPolicy, usePolicyVersions, usePublishPolicy } from "@/lib/security-policy/queries";
import { policyToForm } from "@/lib/security-policy/dto";
import { policySchema, reasonSchema, type PolicyForm, type ReasonForm } from "@/lib/security-policy/schemas";
import type { SecurityPolicyDto } from "@/lib/security-policy/dto";

type NumKey =
  | "max_failed_attempts"
  | "lockout_duration_minutes"
  | "access_token_ttl_minutes"
  | "refresh_token_ttl_days"
  | "password_min_length"
  | "password_history_check_count"
  | "password_max_age_days"
  | "sensitive_action_reauth_minutes";

type BoolKey =
  | "password_require_uppercase"
  | "password_require_lowercase"
  | "password_require_number"
  | "password_require_symbol"
  | "mfa_required";

function versionActor(version: SecurityPolicyDto): string {
  return version.created_by?.email ?? version.created_by_admin_id ?? "-";
}

export function SecurityPolicyEditor() {
  const t = useTranslations("securityPolicy");
  const tc = useTranslations("common");
  const te = useTranslations("apiErrors");
  const locale = useLocale();

  const currentQuery = useCurrentPolicy();
  const versionsQuery = usePolicyVersions();
  const publish = usePublishPolicy();
  const current = currentQuery.data ?? null;
  const history = useMemo(() => versionsQuery.data ?? [], [versionsQuery.data]);

  const [saveOpen, setSaveOpen] = useState(false);

  const policySchemaMemo = useMemo(
    () =>
      policySchema({
        atLeast: (count) => t("atLeast", { n: count }),
        passwordFloor: t("passwordFloor"),
        mustBeNumber: t("mustBeNumber"),
        mustBeInteger: t("mustBeInteger"),
      }),
    [t],
  );
  const policyForm = useForm<PolicyForm>({
    resolver: zodResolver(policySchemaMemo),
    mode: "onSubmit",
    defaultValues: current ? policyToForm(current) : undefined,
  });
  const { register, control, reset, getValues, handleSubmit, formState } = policyForm;
  const dirty = formState.isDirty;

  const reasonForm = useForm<ReasonForm>({
    resolver: zodResolver(reasonSchema({ reasonRequired: t("reasonRequired") })),
    mode: "onSubmit",
    defaultValues: { reason: "" },
  });

  useEffect(() => {
    if (current && !dirty) reset(policyToForm(current));
  }, [current, dirty, reset]);

  const onReset = () => {
    if (current) reset(policyToForm(current));
  };

  const openSave = handleSubmit(() => {
    reasonForm.reset({ reason: "" });
    setSaveOpen(true);
  });

  const confirmSave = reasonForm.handleSubmit(async (reasonValues) => {
    if (publish.isPending) return;
    const values = getValues();
    try {
      await publish.mutateAsync({ ...values, change_reason: reasonValues.reason });
      reset(values);
      setSaveOpen(false);
      toast.success(t("savedToast"));
    } catch (error) {
      toast.error(apiErrorMessage(error, te));
    }
  });

  const fmtIso = (iso: string | null | undefined) => (iso ? fmtDateTimeParts(Date.parse(iso), locale).date : "-");
  const fmtMins = (minutes: number) => {
    const hourLabel = t("hShort");
    const minuteLabel = t("mShort");
    if (minutes < 60) return `${minutes}${minuteLabel}`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes ? `${hours}${hourLabel} ${remainingMinutes}${minuteLabel}` : `${hours}${hourLabel}`;
  };

  if (currentQuery.isError || versionsQuery.isError) {
    return (
      <div className="mx-auto max-w-5xl">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-muted-foreground">{t("loadError")}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                currentQuery.refetch();
                versionsQuery.refetch();
              }}
            >
              {tc("retry")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentQuery.isPending || versionsQuery.isPending || !current) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <Skeleton className="h-8 w-56" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const numField = (key: NumKey, label: string, unit: string, hint?: string) => (
    <Field
      label={label}
      htmlFor={`sp-${key}`}
      hint={hint}
      error={formState.errors[key]?.message}
      reserveMessage={false}
    >
      <div className="flex items-center gap-2">
        <Input id={`sp-${key}`} type="number" min={0} {...register(key, { valueAsNumber: true })} className="w-24" />
        <span className="text-sm text-muted-foreground">{unit}</span>
      </div>
    </Field>
  );

  const switchRow = (key: BoolKey, label: string, hint?: string) => (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-1.5">
      <span className="flex flex-col">
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </span>
      <Controller
        control={control}
        name={key}
        render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
      />
    </label>
  );

  const section = (title: string, children: ReactNode) => (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
      {children}
    </section>
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground text-pretty">{t("subtitle")}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("currentSummary", { date: fmtIso(current.created_at), name: versionActor(current) })}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Card>
            <Form onSubmit={openSave}>
              <CardContent className="flex flex-col gap-6">
                {section(
                  t("sectionLockout"),
                  <div className="grid gap-4 sm:grid-cols-2">
                    {numField("max_failed_attempts", t("lockoutThreshold"), t("unitAttempts"), t("lockoutThresholdHint"))}
                    {numField("lockout_duration_minutes", t("lockoutDuration"), t("unitMinutes"))}
                  </div>,
                )}
                {section(
                  t("sectionSessions"),
                  <div className="grid gap-4 sm:grid-cols-2">
                    {numField("access_token_ttl_minutes", t("accessTokenTtl"), t("unitMinutes"))}
                    {numField("refresh_token_ttl_days", t("refreshTokenTtl"), t("unitDays"))}
                  </div>,
                )}
                {section(
                  t("sectionPassword"),
                  <div className="flex flex-col gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      {numField("password_min_length", t("minLength"), t("unitChars"))}
                      {numField("password_history_check_count", t("historyCount"), t("unitPasswords"), t("historyHint"))}
                      {numField("password_max_age_days", t("passwordMaxAge"), t("unitDays"), t("passwordMaxAgeHint"))}
                    </div>
                    <div className="flex flex-col gap-2">
                      {switchRow("password_require_uppercase", t("requireUpper"))}
                      {switchRow("password_require_lowercase", t("requireLowercase"))}
                      {switchRow("password_require_number", t("requireNumber"))}
                      {switchRow("password_require_symbol", t("requireSymbol"))}
                    </div>
                  </div>,
                )}
                {section(
                  t("sectionMfa"),
                  <div className="flex flex-col gap-4">
                    {switchRow("mfa_required", t("mfaRequired"), t("mfaHint"))}
                    {numField("sensitive_action_reauth_minutes", t("reauthWindow"), t("unitMinutes"), t("reauthHint"))}
                  </div>,
                )}
              </CardContent>
            </Form>
            <CardFooter className="flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              {dirty && <span className="text-xs text-muted-foreground">{t("unsaved")}</span>}
              <ButtonRow layout="split" className="sm:ms-auto">
                <Button variant="secondary" size="lg" onClick={onReset} disabled={!dirty}>
                  {t("reset")}
                </Button>
                <Button size="lg" onClick={openSave} disabled={!dirty}>
                  {t("save")}
                </Button>
              </ButtonRow>
            </CardFooter>
          </Card>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("postureTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <DetailList
                items={[
                  {
                    label: t("pMfa"),
                    value: (
                      <StatusBadge
                        tone={current.mfa_required ? "success" : "neutral"}
                        equalWidth={false}
                        className="w-fit"
                      >
                        {current.mfa_required ? t("on") : t("off")}
                      </StatusBadge>
                    ),
                  },
                  { label: t("pLockout"), value: `${current.max_failed_attempts} ${t("unitAttempts")}` },
                  { label: t("pAccessToken"), value: fmtMins(current.access_token_ttl_minutes) },
                  { label: t("pRefreshToken"), value: `${current.refresh_token_ttl_days} ${t("unitDays")}` },
                  { label: t("pPassword"), value: `${current.password_min_length} ${t("unitChars")}` },
                  { label: t("pReauth"), value: fmtMins(current.sensitive_action_reauth_minutes) },
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("historyTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="flex flex-col">
                {history.map((version, i) => {
                  const isCurrent = version.id === current.id;
                  const last = i === history.length - 1;
                  return (
                    <li key={version.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span
                          className={cn(
                            "mt-1 size-2.5 shrink-0 rounded-full",
                            isCurrent ? "bg-primary ring-2 ring-primary/20" : "bg-border-strong",
                          )}
                        />
                        {!last && <span className="w-px flex-1 bg-border" />}
                      </div>
                      <div className={cn("flex flex-col gap-1", last ? "pb-0" : "pb-5")}>
                        {isCurrent && (
                          <StatusBadge tone="success" equalWidth={false} className="w-fit">
                            {t("current")}
                          </StatusBadge>
                        )}
                        <span className="text-sm font-medium tabular">
                          {t("effective", {
                            from: fmtIso(version.fd ?? version.created_at),
                            to: version.id === current.id ? t("ongoing") : fmtIso(version.td),
                          })}
                        </span>
                        <p className="text-sm text-muted-foreground">{version.change_reason ?? "-"}</p>
                        <span className="text-xs text-muted-foreground">
                          {t("changedBy", { name: versionActor(version) })}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={saveOpen} onOpenChange={(open) => !publish.isPending && setSaveOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("saveTitle")}</DialogTitle>
            <DialogDescription>{t("saveDesc")}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Field label={t("reasonLabel")} htmlFor="sp-reason" error={reasonForm.formState.errors.reason?.message}>
              <Textarea
                id="sp-reason"
                rows={3}
                {...reasonForm.register("reason")}
                placeholder={t("reasonPlaceholder")}
                autoFocus
              />
            </Field>
          </DialogBody>
          <DialogFooter layout="split">
            <Button variant="outline" size="lg" onClick={() => setSaveOpen(false)} disabled={publish.isPending}>
              {tc("cancel")}
            </Button>
            <Button size="lg" onClick={confirmSave} loading={publish.isPending}>
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
