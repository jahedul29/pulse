"use client";

import { useState } from "react";
import { CalendarClock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PERIOD_PRESETS, periodRange, sameRange, isPeriodRange, type PeriodPreset, type PeriodRange } from "@/lib/audit/periods";

const ANY = "any";
const CUSTOM = "custom";

export function PeriodFilter({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (range: PeriodRange | undefined) => void;
}) {
  const tc = useTranslations("common");
  const [chosen, setChosen] = useState<{ preset: PeriodPreset; range: PeriodRange } | null>(null);
  const current = chosen && sameRange(chosen.range, value) ? chosen.preset : isPeriodRange(value) ? CUSTOM : ANY;
  const label = (key: string) => tc(`period_${key}`);

  const select = (next: string | null) => {
    if (!next || next === CUSTOM) return;
    if (next === ANY) {
      setChosen(null);
      onChange(undefined);
      return;
    }
    const preset = next as PeriodPreset;
    const range = periodRange(preset);
    setChosen({ preset, range });
    onChange(range);
  };

  return (
    <Select value={current} onValueChange={select}>
      <SelectTrigger
        className="max-sm:h-9 max-sm:w-[42px] max-sm:justify-center max-sm:px-0 max-sm:[&>svg:last-child]:hidden sm:w-44"
        aria-label={tc("periodLabel")}
      >
        <CalendarClock className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <SelectValue className="max-sm:sr-only">{(selected: string) => label(selected)}</SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value={ANY}>{label(ANY)}</SelectItem>
        {PERIOD_PRESETS.map((preset) => (
          <SelectItem key={preset} value={preset}>
            {label(preset)}
          </SelectItem>
        ))}
        {current === CUSTOM && (
          <SelectItem value={CUSTOM} disabled>
            {label(CUSTOM)}
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
