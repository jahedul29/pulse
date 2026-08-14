"use client";

import { useState } from "react";
import { Info, RotateCcw, Save, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SLOTS_PER_DAY, WEEKDAY_LABELS } from "@/lib/availability/constants";
import { addBlock, setAvailable, validateDay } from "@/lib/availability/rules";
import type { DayState, PaintStatus, RuleConfig } from "@/lib/availability/types";
import { ROLE_BADGE, ROLE_LABEL, useSpecialistStore, type Specialist } from "@/lib/specialists";
import { cn } from "@/lib/utils";
import { PaintControls } from "./control-bar";
import { GuidelinesDialog } from "./guidelines-dialog";
import { NoticeDialog, NoticeHl } from "./notice-dialog";
import { RulesConfigDialog } from "./rules-config-dialog";
import { WeekGrid } from "./week-grid";

function fullDay(): DayState {
  return { blocks: [{ start: 0, end: SLOTS_PER_DAY, kind: "unavailable" }] };
}

function weekIssues(days: DayState[], daysOff: number[], config: RuleConfig): string[] {
  const issues: string[] = [];
  const firstWorkday = days.findIndex((_, i) => !daysOff.includes(i));
  if (firstWorkday !== -1) {
    const fail = validateDay(days[firstWorkday], config, { isWorkday: true }).find((r) => !r.pass);
    if (fail) issues.push(`Weekdays — ${fail.label.toLowerCase()}`);
  }
  for (const d of daysOff) {
    const fail = validateDay(days[d], config, { isWorkday: false }).find((r) => !r.pass);
    if (fail) issues.push(`${WEEKDAY_LABELS[d]} — ${fail.label.toLowerCase()}`);
  }
  return issues;
}

export function AvailabilityEditor({ specialist }: { specialist: Specialist }) {
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
      toast.error(fail.message, { style: { whiteSpace: "pre-line" } });
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
      toast.error(`Maximum ${config.maxDaysOff} ${config.maxDaysOff === 1 ? "day" : "days"} off allowed`);
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
    setDays((prev) => prev.map((_, i) => (daysOff.includes(i) ? fullDay() : { blocks: [] })));
    setShowViolations(false);
    toast.info("Travel time updated — calendar reset");
  };

  const handleSaveRules = (next: RuleConfig) => {
    setConfig(next);
    setShowViolations(false);
    toast.success("Calendar rules updated");
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
      toast.error(`Can't save — ${issues.join(" · ")}`);
      return;
    }

    saveAvailability(specialist.id, { config, days, daysOff, defined: true });
    setShowViolations(false);

    if (specialist.role === "analyst" && isMaxAvailability) {
      setNotice("max-availability");
    } else {
      toast.success(`Availability saved for ${specialist.name}`);
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
              {ROLE_LABEL[specialist.role]}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button variant="outline" size="sm" onClick={() => setRulesOpen(true)}>
            <SlidersHorizontal className="size-3.5" />
            <span className="hidden sm:inline">Rules</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="size-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="size-3.5" />
            <span className="hidden sm:inline">Save</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-1 text-center">
        <h2 className="font-heading text-xl font-semibold">
          Select your weekly business hours as a {ROLE_LABEL[specialist.role]}
        </h2>
        <button
          type="button"
          onClick={() => setGuidelinesOpen(true)}
          className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground md:text-sm"
        >
          We recommend checking these guidelines
          <Info className="size-4 text-primary" />
        </button>
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

      <NoticeDialog
        open={notice === "max-availability"}
        onOpenChange={(o) => !o && setNotice(null)}
        title="Business hours set to maximum availability"
      >
        Your weekly business hours are set to{" "}
        <NoticeHl>maximum availability 06:00–24:00, MO–SU</NoticeHl>. You can change them until the
        first booking for your services is confirmed.
      </NoticeDialog>

      <NoticeDialog
        open={notice === "travel"}
        onOpenChange={(o) => !o && setNotice(null)}
        title="Select a travel time"
      >
        <p>
          Please select for the Therapist your preferred <NoticeHl>TRAVEL TIME</NoticeHl> option.
        </p>
        <p>You can change it later until the first booking for your services is confirmed.</p>
      </NoticeDialog>
    </div>
  );
}
