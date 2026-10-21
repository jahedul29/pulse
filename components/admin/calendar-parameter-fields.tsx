"use client";

import { useMemo, type ComponentProps, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { IconInput } from "@/components/ui/icon-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/common/multi-select";
import { MINUTE_CHOICES } from "@abapro-front-end/calendars";
import { PARAMETER_UNITS, TRAVEL_CHOICES } from "@/lib/calendars/parameters";
import { NUMBER_LIMITS, type CountKey, type ParameterMessages } from "@/lib/calendars/schemas";
import { cn } from "@/lib/utils";

export function useParameterMessages(): ParameterMessages {
  const t = useTranslations("calendarSettings.errors");
  return useMemo(
    () => ({
      mustBeNumber: t("mustBeNumber"),
      wholeNumber: t("wholeNumber"),
      minutesRange: t("minutesRange"),
      daysPerWeek: t("daysPerWeek"),
      daysPerYear: t("daysPerYear"),
      weeksRange: t("weeksRange"),
      travelRange: t("travelRange"),
      windowTooShort: t("windowTooShort"),
      travelEmpty: t("travelEmpty"),
      travelDuplicate: t("travelDuplicate"),
    }),
    [t],
  );
}

export function ParameterSection({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-t pt-6 first:border-t-0 first:pt-0 xl:grid-cols-[13rem_minmax(0,1fr)] xl:gap-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {hint && <p className="text-sm text-muted-foreground text-pretty">{hint}</p>}
      </div>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </section>
  );
}

export function UnitInput({
  parameter,
  className,
  ...props
}: ComponentProps<typeof IconInput> & { parameter: CountKey }) {
  const t = useTranslations("calendarSettings");
  return (
    <IconInput
      type="number"
      inputMode="numeric"
      min={0}
      max={NUMBER_LIMITS[parameter]}
      step={1}
      trailing={<span className="text-xs">{t(`units.${PARAMETER_UNITS[parameter]}`)}</span>}
      className={cn(
        "tabular pe-16 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
        className,
      )}
      {...props}
    />
  );
}

export function MinutesSelect({
  id,
  value,
  onChange,
  disabled,
  invalid,
}: {
  id: string;
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const t = useTranslations("calendarSettings");
  return (
    <Select value={value} onValueChange={(next) => onChange(Number(next))} disabled={disabled}>
      <SelectTrigger id={id} aria-invalid={invalid || undefined} className="tabular w-full">
        <SelectValue>{(selected) => (selected == null ? "" : t("values.minutes", { value: Number(selected) }))}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {MINUTE_CHOICES.map((minutes) => (
          <SelectItem key={minutes} value={minutes} className="tabular">
            {t("values.minutes", { value: minutes })}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function TravelChoices({
  value,
  onChange,
  id,
  error,
  disabled,
  maxChips = 3,
}: {
  value: number[];
  onChange: (next: number[]) => void;
  id: string;
  error?: string;
  disabled?: boolean;
  maxChips?: number;
}) {
  const t = useTranslations("calendarSettings");
  const options = useMemo(
    () => TRAVEL_CHOICES.map((minutes) => ({ value: String(minutes), label: t("values.minutes", { value: minutes }) })),
    [t],
  );
  return (
    <MultiSelect
      options={options}
      value={value.map(String)}
      onChange={(next) => onChange(next.map(Number).sort((first, second) => first - second))}
      placeholder={t("travelOptionsPlaceholder")}
      searchPlaceholder={t("travelSearch")}
      emptyLabel={t("travelNoMatches")}
      maxChips={maxChips}
      disabled={disabled}
      id={id}
      invalid={Boolean(error)}
      describedBy={error ? `${id}-error` : undefined}
    />
  );
}
