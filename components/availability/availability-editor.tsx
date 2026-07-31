"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SLOTS_PER_DAY, WEEKDAY_LABELS } from "@/lib/availability/constants";
import {
  addBlock,
  blockSubMinAvailability,
  removeBlock,
  resizeBlock,
  validateDay,
  weekPasses,
} from "@/lib/availability/rules";
import type { Block, DayState, MarkKind, RuleConfig } from "@/lib/availability/types";
import { ROLE_BADGE, ROLE_LABEL, useSpecialistStore, type Specialist } from "@/lib/specialists";
import { cn } from "@/lib/utils";
import { ControlBar } from "./control-bar";
import { Legend } from "./legend";
import { RulesConfigDialog } from "./rules-config-dialog";
import { RulesPanel } from "./rules-panel";
import { WeekGrid } from "./week-grid";

interface EditorState {
  config: RuleConfig;
  activeKind: MarkKind;
  days: DayState[];
  daysOff: number[];
  focusedDay: number;
}

type Action =
  | { type: "setConfig"; config: RuleConfig }
  | { type: "resetSchedule" }
  | { type: "setActiveKind"; kind: MarkKind }
  | { type: "addBlock"; dayIndex: number; draft: Block }
  | { type: "setDay"; dayIndex: number; day: DayState }
  | { type: "removeBlock"; dayIndex: number; index: number }
  | { type: "resizeBlock"; dayIndex: number; index: number; start: number; end: number }
  | { type: "toggleFullDay"; dayIndex: number }
  | { type: "toggleDayOff"; dayIndex: number }
  | { type: "focusDay"; dayIndex: number };

function initState(specialist: Specialist): EditorState {
  return {
    config: specialist.config,
    activeKind: "unavailable",
    days: specialist.days,
    daysOff: specialist.daysOff,
    focusedDay: 0,
  };
}

function isFullyUnavailable(day: DayState): boolean {
  return (
    day.blocks.length === 1 &&
    day.blocks[0].start === 0 &&
    day.blocks[0].end === SLOTS_PER_DAY &&
    day.blocks[0].kind === "unavailable"
  );
}

function reducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case "setConfig":
      return { ...state, config: action.config };
    case "resetSchedule":
      return { ...state, days: state.days.map(() => ({ blocks: [] })) };
    case "setActiveKind":
      return { ...state, activeKind: action.kind };
    case "toggleFullDay": {
      const full = isFullyUnavailable(state.days[action.dayIndex]);
      const next: DayState = full
        ? { blocks: [] }
        : { blocks: [{ start: 0, end: SLOTS_PER_DAY, kind: "unavailable" }] };
      return {
        ...state,
        days: state.days.map((d, i) => (i === action.dayIndex ? next : d)),
        focusedDay: action.dayIndex,
      };
    }
    case "addBlock":
      return {
        ...state,
        days: state.days.map((d, i) => (i === action.dayIndex ? addBlock(d, action.draft) : d)),
      };
    case "setDay":
      return {
        ...state,
        days: state.days.map((d, i) => (i === action.dayIndex ? action.day : d)),
      };
    case "removeBlock":
      return {
        ...state,
        days: state.days.map((d, i) => (i === action.dayIndex ? removeBlock(d, action.index) : d)),
      };
    case "resizeBlock":
      return {
        ...state,
        days: state.days.map((d, i) =>
          i === action.dayIndex ? resizeBlock(d, action.index, action.start, action.end) : d,
        ),
      };
    case "toggleDayOff": {
      const has = state.daysOff.includes(action.dayIndex);
      const nextDay: DayState = has
        ? { blocks: [] }
        : { blocks: [{ start: 0, end: SLOTS_PER_DAY, kind: "unavailable" }] };
      return {
        ...state,
        daysOff: has
          ? state.daysOff.filter((d) => d !== action.dayIndex)
          : [...state.daysOff, action.dayIndex],
        days: state.days.map((d, i) => (i === action.dayIndex ? nextDay : d)),
      };
    }
    case "focusDay":
      return { ...state, focusedDay: action.dayIndex };
    default:
      return state;
  }
}

function firstNewFailure(
  before: DayState,
  after: DayState,
  config: RuleConfig,
  isWorkday: boolean,
): string | null {
  const b = validateDay(before, config, { isWorkday });
  const a = validateDay(after, config, { isWorkday });
  for (const r of a) {
    const prev = b.find((x) => x.id === r.id);
    if (!r.pass && prev?.pass) return r.id;
  }
  return null;
}

export function AvailabilityEditor({ specialist }: { specialist: Specialist }) {
  const [state, dispatch] = useReducer(reducer, specialist, initState);
  const saveAvailability = useSpecialistStore((s) => s.saveAvailability);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [shake, setShake] = useState<{ ruleId: string; nonce: number } | null>(null);
  const shakeSeq = useRef(0);

  useEffect(() => {
    if (!shake) return;
    const t = setTimeout(() => setShake(null), 600);
    return () => clearTimeout(t);
  }, [shake]);

  const triggerShake = (ruleId: string, dayIndex?: number) => {
    shakeSeq.current += 1;
    if (dayIndex !== undefined) dispatch({ type: "focusDay", dayIndex });
    setShake({ ruleId, nonce: shakeSeq.current });
  };

  const { config, activeKind, days, daysOff, focusedDay } = state;

  const focusedIsOff = daysOff.includes(focusedDay);
  const results = validateDay(days[focusedDay], config, { isWorkday: !focusedIsOff });
  const weekValid = weekPasses({ days, daysOff, config });

  const contextLabel = `${focusedIsOff ? "Day off" : "Workday"} · ${WEEKDAY_LABELS[focusedDay]}`;

  const commitPaint = (dayIndex: number, candidate: DayState, failed: string) => {
    const fixed = blockSubMinAvailability(candidate, config);
    if (firstNewFailure(days[dayIndex], fixed, config, !daysOff.includes(dayIndex)) === null) {
      dispatch({ type: "setDay", dayIndex, day: fixed });
    }
    triggerShake(failed, dayIndex);
  };

  const handleAddBlock = (dayIndex: number, draft: Block) => {
    const current = days[dayIndex];
    const candidate = addBlock(current, draft);
    const failed = firstNewFailure(current, candidate, config, !daysOff.includes(dayIndex));
    if (!failed) {
      dispatch({ type: "addBlock", dayIndex, draft });
      return;
    }
    commitPaint(dayIndex, candidate, failed);
  };

  const handleResizeBlock = (dayIndex: number, index: number, start: number, end: number) => {
    const current = days[dayIndex];
    const candidate = resizeBlock(current, index, start, end);
    const failed = firstNewFailure(current, candidate, config, !daysOff.includes(dayIndex));
    if (!failed) {
      dispatch({ type: "resizeBlock", dayIndex, index, start, end });
      return;
    }
    commitPaint(dayIndex, candidate, failed);
  };

  const handleFillDay = (dayIndex: number) => {
    dispatch({ type: "toggleFullDay", dayIndex });
  };

  const handleToggleDayOff = (dayIndex: number) => {
    const adding = !daysOff.includes(dayIndex);
    if (adding && daysOff.length >= config.maxDaysOff) {
      triggerShake("days-off");
      toast.error(`Up to ${config.maxDaysOff} days off per week`);
      return;
    }
    dispatch({ type: "toggleDayOff", dayIndex });
  };

  const handleSaveRules = (next: RuleConfig, travelChanged: boolean) => {
    dispatch({ type: "setConfig", config: next });
    if (travelChanged) {
      dispatch({ type: "resetSchedule" });
      toast.info("Travel time changed — calendar reset");
    } else {
      toast.success("Calendar rules updated");
    }
  };

  const handleSave = () => {
    saveAvailability(specialist.id, { config, days, daysOff });
    toast.success(`Availability saved for ${specialist.name}`);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="grid size-11 place-items-center rounded-full bg-primary/12 font-heading text-sm font-semibold text-primary ring-1 ring-primary/20">
          {specialist.initials}
        </div>
        <div>
          <div className="font-heading text-base font-semibold leading-tight">{specialist.name}</div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn("rounded-full px-2 py-0.5 font-medium", ROLE_BADGE[specialist.role])}>
              {ROLE_LABEL[specialist.role]}
            </span>
            Weekly availability
          </div>
        </div>
      </div>

      <ControlBar
        config={config}
        activeKind={activeKind}
        onActiveKindChange={(k) => dispatch({ type: "setActiveKind", kind: k })}
        onOpenRules={() => setRulesOpen(true)}
        onReset={() => dispatch({ type: "resetSchedule" })}
        onSave={handleSave}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-3">
          <WeekGrid
            days={days}
            daysOff={daysOff}
            config={config}
            activeKind={activeKind}
            focusedDay={focusedDay}
            onAddBlock={handleAddBlock}
            onRemoveBlock={(dayIndex, index) => dispatch({ type: "removeBlock", dayIndex, index })}
            onResizeBlock={handleResizeBlock}
            onToggleDayOff={handleToggleDayOff}
            onFillDay={handleFillDay}
            onFocusDay={(dayIndex) => dispatch({ type: "focusDay", dayIndex })}
          />
          <Legend supportsOnline={config.supportsOnline} />
        </div>

        <Card size="sm" className="h-fit">
          <CardHeader>
            <CardTitle>Rule check</CardTitle>
          </CardHeader>
          <CardContent>
            <RulesPanel
              contextLabel={contextLabel}
              results={results}
              daysOffCount={daysOff.length}
              maxDaysOff={config.maxDaysOff}
              weekValid={weekValid}
              shake={shake}
            />
          </CardContent>
        </Card>
      </div>

      <RulesConfigDialog
        open={rulesOpen}
        onOpenChange={setRulesOpen}
        config={config}
        onSave={handleSaveRules}
      />
    </div>
  );
}
