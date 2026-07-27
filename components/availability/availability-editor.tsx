"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { addDays, format } from "date-fns";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addBlock, removeBlock, resizeBlock, validateDay, weekPasses } from "@/lib/availability/rules";
import type { Block, BlockType, DayState, RuleConfig } from "@/lib/availability/types";
import { ROLE_BADGE, ROLE_LABEL, useSpecialistStore, type Specialist } from "@/lib/specialists";
import { cn } from "@/lib/utils";
import { ControlBar } from "./control-bar";
import { Legend } from "./legend";
import { RulesConfigDialog } from "./rules-config-dialog";
import { RulesPanel } from "./rules-panel";
import { WeekGrid } from "./week-grid";
import { WeekNav, mondayOf } from "./week-nav";

interface EditorState {
  config: RuleConfig;
  activeBlockType: BlockType;
  weekStart: Date;
  days: DayState[];
  daysOff: number[];
  focusedDay: number;
}

type Action =
  | { type: "setConfig"; config: RuleConfig }
  | { type: "resetSchedule" }
  | { type: "setActiveBlockType"; blockType: BlockType }
  | { type: "setWeekStart"; weekStart: Date }
  | { type: "addBlock"; dayIndex: number; draft: Block }
  | { type: "removeBlock"; dayIndex: number; index: number }
  | { type: "resizeBlock"; dayIndex: number; index: number; start: number; end: number }
  | { type: "toggleDayOff"; dayIndex: number }
  | { type: "focusDay"; dayIndex: number };

function initState(specialist: Specialist): EditorState {
  return {
    config: specialist.config,
    activeBlockType: "in_person",
    weekStart: mondayOf(new Date()),
    days: specialist.days,
    daysOff: specialist.daysOff,
    focusedDay: 0,
  };
}

function reducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case "setConfig":
      return { ...state, config: action.config };
    case "resetSchedule":
      return { ...state, days: state.days.map(() => ({ blocks: [] })) };
    case "setActiveBlockType":
      return { ...state, activeBlockType: action.blockType };
    case "setWeekStart":
      return { ...state, weekStart: action.weekStart };
    case "addBlock":
      return {
        ...state,
        days: state.days.map((d, i) => (i === action.dayIndex ? addBlock(d, action.draft) : d)),
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
      return {
        ...state,
        daysOff: has
          ? state.daysOff.filter((d) => d !== action.dayIndex)
          : [...state.daysOff, action.dayIndex],
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

  const { config, activeBlockType, weekStart, days, daysOff, focusedDay } = state;

  const focusedIsOff = daysOff.includes(focusedDay);
  const results = validateDay(days[focusedDay], config, { isWorkday: !focusedIsOff });
  const weekValid = weekPasses({ days, daysOff, config });

  const focusedDate = format(addDays(weekStart, focusedDay), "EEE d MMM");
  const contextLabel = focusedIsOff ? `Day off · ${focusedDate}` : `Workday · ${focusedDate}`;

  const handleAddBlock = (dayIndex: number, draft: Block) => {
    const current = days[dayIndex];
    const candidate = addBlock(current, draft);
    const failed = firstNewFailure(current, candidate, config, !daysOff.includes(dayIndex));
    if (failed) return triggerShake(failed, dayIndex);
    dispatch({ type: "addBlock", dayIndex, draft });
  };

  const handleResizeBlock = (dayIndex: number, index: number, start: number, end: number) => {
    const current = days[dayIndex];
    const candidate = resizeBlock(current, index, start, end);
    const failed = firstNewFailure(current, candidate, config, !daysOff.includes(dayIndex));
    if (failed) return triggerShake(failed, dayIndex);
    dispatch({ type: "resizeBlock", dayIndex, index, start, end });
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
      <div className="flex flex-wrap items-center justify-between gap-4">
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
        <WeekNav weekStart={weekStart} onChange={(d) => dispatch({ type: "setWeekStart", weekStart: d })} />
      </div>

      <ControlBar
        config={config}
        activeBlockType={activeBlockType}
        onActiveBlockTypeChange={(t) => dispatch({ type: "setActiveBlockType", blockType: t })}
        onOpenRules={() => setRulesOpen(true)}
        onReset={() => dispatch({ type: "resetSchedule" })}
        onSave={handleSave}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-3">
          <WeekGrid
            weekStart={weekStart}
            days={days}
            daysOff={daysOff}
            config={config}
            activeBlockType={activeBlockType}
            focusedDay={focusedDay}
            onAddBlock={handleAddBlock}
            onRemoveBlock={(dayIndex, index) => dispatch({ type: "removeBlock", dayIndex, index })}
            onResizeBlock={handleResizeBlock}
            onToggleDayOff={handleToggleDayOff}
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
