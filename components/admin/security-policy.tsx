"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ButtonRow } from "@/components/ui/button-row";
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
import { usePolicyStore } from "@/lib/security-policy/store";
import { useAuthStore } from "@/lib/auth/store";
import { fetchPolicyVersions } from "@/lib/security-policy/api";
import { policySchema, reasonSchema, type ReasonForm } from "@/lib/security-policy/schemas";
import type { PolicyVersion, SecurityPolicy } from "@/lib/security-policy/types";

type NumKey =
  | "lockoutThreshold"
  | "lockoutDurationMins"
  | "sessionLifetimeMins"
  | "tokenLifetimeMins"
  | "passwordMinLength"
  | "passwordHistoryCount"
  | "reauthWindowMins"
  | "inviteExpiryDays";

type BoolKey =
  | "passwordRequireUpper"
  | "passwordRequireNumber"
  | "passwordRequireSymbol"
  | "mfaRequired";

export function SecurityPolicyEditor() {
  const t = useTranslations("securityPolicy");
  const tc = useTranslations("common");
  const locale = useLocale();

  const versionsState = usePolicyStore((s) => s.versions);
  const savePolicy = usePolicyStore((s) => s.savePolicy);
  const actorName = useAuthStore((s) => s.session?.name ?? "You");

  const [history, setHistory] = useState<PolicyVersion[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  const current = useMemo(
    () => versionsState.find((v) => v.effectiveTo == null)?.policy ?? null,
    [versionsState],
  );

  const policySchemaMemo = useMemo(
    () =>
      policySchema({
        atLeast: (n) => t("atLeast", { n }),
        passwordFloor: t("passwordFloor"),
        mustBeNumber: t("mustBeNumber"),
        mustBeInteger: t("mustBeInteger"),
      }),
    [t],
  );
  const policyForm = useForm<SecurityPolicy>({
    resolver: zodResolver(policySchemaMemo),
    mode: "onSubmit",
    defaultValues: current ?? undefined,
  });
  const { register, control, reset, getValues, handleSubmit, formState } = policyForm;
  const dirty = formState.isDirty;

  const reasonForm = useForm<ReasonForm>({
    resolver: zodResolver(reasonSchema({ reasonRequired: t("reasonRequired") })),
    mode: "onSubmit",
    defaultValues: { reason: "" },
  });

  useEffect(() => {
    if (current && !dirty) reset(current);
  }, [current, dirty, reset]);

  useEffect(() => {
    let active = true;
    fetchPolicyVersions()
      .then((v) => {
        if (!active) return;
        setHistory(v);
        setLoaded(true);
      })
      .catch(() => {
        if (!active) return;
        setError(true);
        setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [versionsState]);

  const onReset = () => {
    if (current) reset(current);
  };

  const openSave = handleSubmit(() => {
    reasonForm.reset({ reason: "" });
    setSaveOpen(true);
  });

  const confirmSave = reasonForm.handleSubmit((rv) => {
    const values = getValues();
    savePolicy(values, rv.reason, actorName);
    reset(values);
    setSaveOpen(false);
    toast.success(t("savedToast"));
  });

  const fmt = (ms: number) => fmtDateTimeParts(ms, locale).date;
  const fmtMins = (m: number) => {
    const H = t("hShort");
    const M = t("mShort");
    if (m < 60) return `${m}${M}`;
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r ? `${h}${H} ${r}${M}` : `${h}${H}`;
  };

  if (error) {
    return (
      <div className="mx-auto max-w-5xl">
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            {t("loadError")}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!loaded || !current) {
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
        <Input
          id={`sp-${key}`}
          type="number"
          min={0}
          {...register(key, { valueAsNumber: true })}
          className="w-24"
        />
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
        render={({ field }) => (
          <Switch checked={field.value} onCheckedChange={field.onChange} />
        )}
      />
    </label>
  );

  const section = (title: string, children: ReactNode) => (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
      {children}
    </section>
  );

  const currentVersion = history.find((v) => v.effectiveTo == null);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground text-pretty">{t("subtitle")}</p>
        {currentVersion && (
          <p className="mt-1 text-xs text-muted-foreground">
            {t("currentSummary", {
              date: fmt(currentVersion.effectiveFrom),
              name: currentVersion.changedBy,
            })}
          </p>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="flex flex-col gap-6">
              {section(
                t("sectionLockout"),
                <div className="grid gap-4 sm:grid-cols-2">
                  {numField("lockoutThreshold", t("lockoutThreshold"), t("unitAttempts"), t("lockoutThresholdHint"))}
                  {numField("lockoutDurationMins", t("lockoutDuration"), t("unitMinutes"))}
                </div>,
              )}
              {section(
                t("sectionSessions"),
                <div className="grid gap-4 sm:grid-cols-2">
                  {numField("sessionLifetimeMins", t("sessionLifetime"), t("unitMinutes"))}
                  {numField("tokenLifetimeMins", t("tokenLifetime"), t("unitMinutes"))}
                  {numField("inviteExpiryDays", t("inviteExpiry"), t("unitDays"), t("inviteExpiryHint"))}
                </div>,
              )}
              {section(
                t("sectionPassword"),
                <div className="flex flex-col gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {numField("passwordMinLength", t("minLength"), t("unitChars"))}
                    {numField("passwordHistoryCount", t("historyCount"), t("unitPasswords"), t("historyHint"))}
                  </div>
                  <div className="flex flex-col gap-2">
                    {switchRow("passwordRequireUpper", t("requireUpper"))}
                    {switchRow("passwordRequireNumber", t("requireNumber"))}
                    {switchRow("passwordRequireSymbol", t("requireSymbol"))}
                  </div>
                </div>,
              )}
              {section(
                t("sectionMfa"),
                <div className="flex flex-col gap-4">
                  {switchRow("mfaRequired", t("mfaRequired"), t("mfaHint"))}
                  {numField("reauthWindowMins", t("reauthWindow"), t("unitMinutes"), t("reauthHint"))}
                </div>,
              )}
            </CardContent>
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
          {currentVersion && (
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
                          tone={currentVersion.policy.mfaRequired ? "success" : "neutral"}
                          equalWidth={false}
                          className="w-fit"
                        >
                          {currentVersion.policy.mfaRequired ? t("on") : t("off")}
                        </StatusBadge>
                      ),
                    },
                    {
                      label: t("pLockout"),
                      value: `${currentVersion.policy.lockoutThreshold} ${t("unitAttempts")}`,
                    },
                    { label: t("pSession"), value: fmtMins(currentVersion.policy.sessionLifetimeMins) },
                    { label: t("pToken"), value: fmtMins(currentVersion.policy.tokenLifetimeMins) },
                    {
                      label: t("pPassword"),
                      value: `${currentVersion.policy.passwordMinLength} ${t("unitChars")}`,
                    },
                    { label: t("pReauth"), value: fmtMins(currentVersion.policy.reauthWindowMins) },
                  ]}
                />
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("historyTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="flex flex-col">
                {history.map((v, i) => {
                  const isCurrent = v.effectiveTo == null;
                  const last = i === history.length - 1;
                  return (
                    <li key={v.id} className="flex gap-3">
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
                            from: fmt(v.effectiveFrom),
                            to: v.effectiveTo == null ? t("ongoing") : fmt(v.effectiveTo),
                          })}
                        </span>
                        <p className="text-sm text-muted-foreground">{v.reason}</p>
                        <span className="text-xs text-muted-foreground">
                          {t("changedBy", { name: v.changedBy })}
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

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("saveTitle")}</DialogTitle>
            <DialogDescription>{t("saveDesc")}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Field
              label={t("reasonLabel")}
              htmlFor="sp-reason"
              error={reasonForm.formState.errors.reason?.message}
            >
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
            <Button variant="outline" size="lg" onClick={() => setSaveOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button size="lg" onClick={confirmSave}>
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
