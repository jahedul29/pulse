"use client";

import { useEffect, useState } from "react";
import { HelpCircle, Info, RotateCcw, Save, SlidersHorizontal } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SLOTS_PER_DAY } from "@/lib/availability/constants";
import { weekdayShortLabels } from "@/lib/i18n/calendar";
import { addBlock, setAvailable, validateDay } from "@/lib/availability/rules";
import type { DayState, PaintStatus, RuleConfig } from "@/lib/availability/types";
import { ROLE_BADGE, useSpecialistStore, type Specialist } from "@/lib/specialists";
import { cn } from "@/lib/utils";
import { CoachDialog } from "./coach-dialog";
import { PaintControls } from "./control-bar";
import { GuidelinesDialog } from "./guidelines-dialog";
import { NoticeDialog, NoticeHl } from "./notice-dialog";
import { RulesConfigDialog } from "./rules-config-dialog";
import { WeekGrid } from "./week-grid";

function fullDay(): DayState {
  return { blocks: [{ start: 0, end: SLOTS_PER_DAY, kind: "unavailable" }] };
}

type WeekIssue = { day: number | "weekdays"; labelKey: string };

function weekIssues(days: DayState[], daysOff: number[], config: RuleConfig): WeekIssue[] {
  const issues: WeekIssue[] = [];
  const firstWorkday = days.findIndex((_, i) => !daysOff.includes(i));
  if (firstWorkday !== -1) {
    const fail = validateDay(days[firstWorkday], config, { isWorkday: true }).find((r) => !r.pass);
    if (fail) issues.push({ day: "weekdays", labelKey: fail.labelKey });
  }
  for (const d of daysOff) {
    const fail = validateDay(days[d], config, { isWorkday: false }).find((r) => !r.pass);
    if (fail) issues.push({ day: d, labelKey: fail.labelKey });
  }
  return issues;
}

export function AvailabilityEditor({ specialist }: { specialist: Specialist }) {
  const t = useTranslations();
  const locale = useLocale();
  const weekdays = weekdayShortLabels(locale);
  const saveAvailability = useSpecialistStore((s) => s.saveAvailability);
  const [config, setConfig] = useState<RuleConfig>(specialist.config);
  const [days, setDays] = useState<DayState[]>(specialist.days);
  const [daysOff, setDaysOff] = useState<number[]>(specialist.daysOff);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const [controlsExpanded, setControlsExpanded] = useState(false);
  const [showViolations, setShowViolations] = useState(false);
  const [notice, setNotice] = useState<"max-availability" | "travel" | null>(null);
  const [shake, setShake] = useState<{ cols: number[]; nonce: number }>({ cols: [], nonce: 0 });
  const [coachOpen, setCoachOpen] = useState(false);

  useEffect(() => {
    setCoachOpen(true);
  }, []);

  const needsTravel = specialist.role === "therapist" && config.travelTimeMins === 0;

  const handlePaint = (dayIndex: number, start: number, end: number, status: PaintStatus) => {
    if (needsTravel) {
      setNotice("travel");
      return;
    }
    const apply = (d: DayState): DayState =>
      status === "available" ? setAvailable(d, start, end) : addBlock(d, { start, end, kind: status });
    const isOff = daysOff.includes(dayIndex);
    // Weekday paint mirrors to every working (non-off) day; a week-off day paints on its own.
    const targets = isOff
      ? [dayIndex]
      : days.map((_, i) => i).filter((i) => !daysOff.includes(i));
    const fail = validateDay(apply(days[dayIndex]), config, { isWorkday: !isOff }).find(
      (r) => !r.pass,
    );
    if (fail) {
      setShake((s) => ({ cols: targets, nonce: s.nonce + 1 }));
      toast.error(t(fail.messageKey, fail.values), { style: { whiteSpace: "pre-line" } });
      return;
    }
    setDays((prev) => prev.map((d, i) => (targets.includes(i) ? apply(d) : d)));
    setShowViolations(false);
  };

  const handleToggleDayOff = (dayIndex: number) => {
    if (needsTravel) {
      setNotice("travel");
      return;
    }
    const off = daysOff.includes(dayIndex);
    if (!off && daysOff.length >= config.maxDaysOff) {
      setShake((s) => ({ cols: [dayIndex], nonce: s.nonce + 1 }));
      toast.error(t("availability.toastDaysOffMax", { max: config.maxDaysOff }));
      return;
    }
    const template = days.find((_, i) => !daysOff.includes(i) && i !== dayIndex);
    const restored: DayState = template ? { blocks: template.blocks.map((b) => ({ ...b })) } : { blocks: [] };
    setDaysOff((prev) => (off ? prev.filter((x) => x !== dayIndex) : [...prev, dayIndex]));
    setDays((prev) => prev.map((d, i) => (i === dayIndex ? (off ? restored : fullDay()) : d)));
    setShowViolations(false);
  };

  const handleTravel = (mins: number) => {
    if (mins === config.travelTimeMins) return;
    setConfig({ ...config, travelTimeMins: mins, minBreakMins: mins });
    setDaysOff([]);
    setDays((prev) => prev.map(() => ({ blocks: [] })));
    setShowViolations(false);
    toast.info(t("availability.toastTravelReset"));
  };

  const handleSaveRules = (next: RuleConfig) => {
    setConfig(next);
    setShowViolations(false);
    toast.success(t("availability.toastRulesUpdated"));
  };

  const handleReset = () => {
    setDays((prev) => prev.map((_, i) => (daysOff.includes(i) ? fullDay() : { blocks: [] })));
    setShowViolations(false);
  };

  const isMaxAvailability =
    daysOff.length === 0 && days.every((d) => d.blocks.length === 0);

  const handleSave = () => {
    // Therapist: not "defined" until a travel time is picked.
    if (specialist.role === "therapist" && config.travelTimeMins === 0) {
      setNotice("travel");
      return;
    }

    const issues = weekIssues(days, daysOff, config);
    if (issues.length) {
      setShowViolations(true);
      const list = issues
        .map((iss) => {
          const day = iss.day === "weekdays" ? t("availability.issueWeekdays") : weekdays[iss.day];
          return `${day} — ${t(iss.labelKey).toLowerCase()}`;
        })
        .join(" · ");
      toast.error(t("availability.cantSave", { issues: list }));
      return;
    }

    saveAvailability(specialist.id, { config, days, daysOff, defined: true });
    setShowViolations(false);

    if (specialist.role === "analyst" && isMaxAvailability) {
      setNotice("max-availability");
    } else {
      toast.success(t("availability.toastSaved", { name: specialist.name }));
    }
  };

  return (
    <div className="theme-violet flex flex-col gap-4 font-manrope text-foreground">
      <div className="flex items-center justify-between gap-3 hidden">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-full bg-primary/12 font-heading text-sm font-semibold text-primary ring-1 ring-primary/20">
            {specialist.initials}
          </div>
          <div>
            <div className="font-heading text-sm font-semibold leading-tight">{specialist.name}</div>
            <span
              className={cn("rounded-full px-2 py-0.5 text-xs font-medium", ROLE_BADGE[specialist.role])}
            >
              {t(`common.role.${specialist.role}`)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button variant="outline" size="sm" onClick={() => setRulesOpen(true)}>
            <SlidersHorizontal className="size-3.5" />
            <span className="hidden sm:inline">{t("availability.btnRules")}</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="size-3.5" />
            <span className="hidden sm:inline">{t("availability.btnReset")}</span>
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="size-3.5" />
            <span className="hidden sm:inline">{t("common.save")}</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-1 text-center">
        <h2 className="font-heading text-xl font-semibold">
          {t("availability.title", { role: t(`common.role.${specialist.role}`) })}
        </h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setGuidelinesOpen(true)}
            className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground md:text-sm"
          >
            {t("common.checkGuidelines")}
            <Info className="size-4 text-primary" />
          </button>
          <button
            type="button"
            onClick={() => setCoachOpen(true)}
            aria-label={t("availability.help")}
            className="inline-flex size-6 cursor-pointer items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10"
          >
            <HelpCircle className="size-4" />
          </button>
        </div>
      </div>

      <PaintControls
        config={config}
        expanded={controlsExpanded}
        onTravelChange={handleTravel}
        onToggleExpanded={() => setControlsExpanded((v) => !v)}
      />

      <WeekGrid
        days={days}
        daysOff={daysOff}
        config={config}
        showViolations={showViolations}
        shakeCols={shake.cols}
        shakeNonce={shake.nonce}
        onPaint={handlePaint}
        onToggleDayOff={handleToggleDayOff}
      />

      <RulesConfigDialog
        open={rulesOpen}
        onOpenChange={setRulesOpen}
        config={config}
        onSave={handleSaveRules}
      />

      <GuidelinesDialog
        open={guidelinesOpen}
        onOpenChange={setGuidelinesOpen}
        role={specialist.role}
        config={config}
      />

      <CoachDialog open={coachOpen} onOpenChange={setCoachOpen} role={specialist.role} />

      <NoticeDialog
        open={notice === "max-availability"}
        onOpenChange={(o) => !o && setNotice(null)}
        title={t("availability.notice.maxAvailTitle")}
      >
        {t.rich("availability.notice.maxAvailBody", {
          hl: (chunks) => <NoticeHl>{chunks}</NoticeHl>,
        })}
      </NoticeDialog>

      <NoticeDialog
        open={notice === "travel"}
        onOpenChange={(o) => !o && setNotice(null)}
        title={t("availability.notice.travelTitle")}
      >
        <p>{t.rich("availability.notice.travelBody1", { hl: (chunks) => <NoticeHl>{chunks}</NoticeHl> })}</p>
        <p>{t("availability.notice.travelBody2")}</p>
      </NoticeDialog>
    </div>
  );
}
