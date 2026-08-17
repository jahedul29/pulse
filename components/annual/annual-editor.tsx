"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { annualConfigFor } from "@/lib/annual/constants";
import { firstFailure, sortIso } from "@/lib/annual/rules";
import { useSpecialistStore, type Specialist } from "@/lib/specialists";
import { AnnualGuidelinesDialog } from "./annual-guidelines-dialog";
import { AnnualLegend } from "./annual-legend";
import { YearGrid } from "./year-grid";
import { YearPickerDialog } from "./year-picker-dialog";

export function AnnualEditor({ specialist }: { specialist: Specialist }) {
  const t = useTranslations();
  const saveAnnual = useSpecialistStore((s) => s.saveAnnual);
  const config = useMemo(() => annualConfigFor(specialist.role), [specialist.role]);

  // Date-dependent parts render only after mount so the first (server-matched) render is
  // date-independent — avoids an SSR/client hydration mismatch and lets the grid mount in a
  // clean commit after hydration completes.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  const now = useMemo(() => (mounted ? new Date() : null), [mounted]);
  const todayIso = now ? format(now, "yyyy-MM-dd") : null;
  const currentYear = now ? now.getFullYear() : null;
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const year = selectedYear ?? currentYear;
  const years = useMemo(
    () => (currentYear == null ? [] : [currentYear, currentYear + 1]),
    [currentYear],
  );

  const [offSet, setOffSet] = useState<Set<string>>(() => new Set(specialist.annualOff));
  const [expanded, setExpanded] = useState(false);
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const [shake, setShake] = useState(0);

  // No Save button (matches the weekly calendar): valid edits persist to the store immediately.
  const handleCommit = (dates: string[], makeUnavailable: boolean) => {
    const next = new Set(offSet);
    for (const d of dates) {
      if (makeUnavailable) next.add(d);
      else next.delete(d);
    }
    if (makeUnavailable) {
      const fail = firstFailure([...next], config);
      if (fail) {
        setShake((n) => n + 1);
        toast.error(t(fail.messageKey, fail.values));
        return;
      }
    }
    setOffSet(next);
    saveAnnual(specialist.id, sortIso([...next]));
  };

  return (
    <div className="theme-violet flex flex-col gap-4 font-manrope text-foreground">
      <div className="flex flex-col items-center gap-1 text-center">
        <h2 className="font-heading text-xl font-semibold text-balance">
          {t("annual.titleTop")}
          <br />
          {t("annual.titleRole", { role: t(`annual.headerRole.${specialist.role}`) })}
        </h2>
        <button
          type="button"
          onClick={() => setGuidelinesOpen(true)}
          className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground md:text-sm"
        >
          {t("common.checkGuidelines")}
          <Info className="size-4 text-primary" />
        </button>
        <p className="text-xs leading-snug text-muted-foreground md:text-sm">
          {t("annual.instr1")}
          <br />
          {t("annual.instr2")}
        </p>
      </div>

      <AnnualLegend expanded={expanded} onToggleExpanded={() => setExpanded((v) => !v)} />

      <div className="-mx-4 min-h-[420px] overflow-x-auto px-[5px] pb-2 md:mx-0 md:flex md:justify-center md:px-0">
        {year != null && todayIso != null && (
          <div
            key={shake}
            className={shake > 0 ? "animate-rule-shake motion-reduce:animate-none" : undefined}
          >
            <YearGrid
              year={year}
              offSet={offSet}
              todayIso={todayIso}
              onCommit={handleCommit}
              onYearClick={() => setYearOpen(true)}
            />
          </div>
        )}
      </div>

      <AnnualGuidelinesDialog
        open={guidelinesOpen}
        onOpenChange={setGuidelinesOpen}
        role={specialist.role}
      />

      <YearPickerDialog
        open={yearOpen}
        onOpenChange={setYearOpen}
        years={years}
        value={year ?? currentYear ?? 0}
        onSelect={setSelectedYear}
      />
    </div>
  );
}
