"use client";

import { Lock, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { SLOTS_PER_DAY, WEEKDAY_LABELS, slotToTime } from "@/lib/availability/constants";
import { validateDay } from "@/lib/availability/rules";
import type { Block, DayState, MarkKind, RuleConfig } from "@/lib/availability/types";
import { DayColumn, SLOT_PX } from "./day-column";

const GRID_COLS = "5rem repeat(7, minmax(0, 1fr))";

export function WeekGrid({
  days,
  daysOff,
  config,
  activeKind,
  focusedDay,
  onAddBlock,
  onRemoveBlock,
  onResizeBlock,
  onToggleDayOff,
  onFillDay,
  onFocusDay,
}: {
  days: DayState[];
  daysOff: number[];
  config: RuleConfig;
  activeKind: MarkKind;
  focusedDay: number;
  onAddBlock: (dayIndex: number, draft: Block) => void;
  onRemoveBlock: (dayIndex: number, index: number) => void;
  onResizeBlock: (dayIndex: number, index: number, start: number, end: number) => void;
  onToggleDayOff: (dayIndex: number) => void;
  onFillDay: (dayIndex: number) => void;
  onFocusDay: (dayIndex: number) => void;
}) {
  const offendingFor = (d: number): Set<number> => {
    const results = validateDay(days[d], config, { isWorkday: !daysOff.includes(d) });
    const set = new Set<number>();
    for (const r of results) r.offending?.forEach((i) => set.add(i));
    return set;
  };

  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <Moon className="size-3.5" />
        <span>
          <span className="tabular font-medium text-foreground">00:00 – 06:00</span> is a fixed
          unavailable block for everyone.
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="max-h-[600px] min-w-[760px] overflow-y-auto">
          <div className="sticky top-0 z-20 grid border-b bg-card" style={{ gridTemplateColumns: GRID_COLS }}>
            <div className="grid place-items-center py-2 text-[10px] font-medium text-muted-foreground">
              Time
            </div>
            {WEEKDAY_LABELS.map((label, d) => {
              const isOff = daysOff.includes(d);
              const focused = focusedDay === d;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => onFillDay(d)}
                  title="Block the whole day"
                  className={cn(
                    "relative flex cursor-pointer items-center justify-center gap-1 border-l px-1 py-2.5 text-center transition-colors",
                    isOff ? "bg-orange-100/80" : "hover:bg-muted/50",
                    focused &&
                      "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary",
                  )}
                >
                  <span className="text-xs font-semibold text-foreground">{label}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleDayOff(d);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        onToggleDayOff(d);
                      }
                    }}
                    title={isOff ? "Mark as workday" : "Mark as day off"}
                    className={cn(
                      "grid size-5 cursor-pointer place-items-center rounded-md transition-colors",
                      isOff
                        ? "text-orange-600 hover:bg-orange-200/70"
                        : "text-muted-foreground/60 hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {isOff ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid" style={{ gridTemplateColumns: GRID_COLS }}>
            <div className="relative" style={{ height: SLOTS_PER_DAY * SLOT_PX }}>
              {Array.from({ length: SLOTS_PER_DAY }, (_, i) => (
                <div
                  key={i}
                  className="tabular absolute inset-x-0 flex items-center justify-end pr-2 text-[10px] leading-none text-muted-foreground"
                  style={{ top: i * SLOT_PX, height: SLOT_PX }}
                >
                  {slotToTime(i)} – {slotToTime(i + 1)}
                </div>
              ))}
            </div>

            {WEEKDAY_LABELS.map((label, d) => (
              <DayColumn
                key={label}
                dayIndex={d}
                day={days[d]}
                config={config}
                activeKind={activeKind}
                offending={offendingFor(d)}
                onAddBlock={onAddBlock}
                onRemoveBlock={onRemoveBlock}
                onResizeBlock={onResizeBlock}
                onFocus={() => onFocusDay(d)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
        <Lock className="size-3" />
        Drag on a day to mark unavailable · click a day heading to block the whole day · sun/moon to
        switch a day off.
      </div>
    </div>
  );
}
