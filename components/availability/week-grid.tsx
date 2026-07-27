"use client";

import { addDays, format } from "date-fns";
import { Lock, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  SLOTS_PER_DAY,
  WEEKDAY_LABELS,
} from "@/lib/availability/constants";
import { validateDay } from "@/lib/availability/rules";
import type { Block, DayState, RuleConfig } from "@/lib/availability/types";
import { DayColumn, SLOT_PX } from "./day-column";

const HOURS = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, i) => DAY_START_HOUR + i);
const GRID_COLS = "3.25rem repeat(7, minmax(0, 1fr))";

export function WeekGrid({
  weekStart,
  days,
  daysOff,
  config,
  activeBlockType,
  focusedDay,
  onAddBlock,
  onRemoveBlock,
  onResizeBlock,
  onToggleDayOff,
  onFocusDay,
}: {
  weekStart: Date;
  days: DayState[];
  daysOff: number[];
  config: RuleConfig;
  activeBlockType: Block["type"];
  focusedDay: number;
  onAddBlock: (dayIndex: number, draft: Block) => void;
  onRemoveBlock: (dayIndex: number, index: number) => void;
  onResizeBlock: (dayIndex: number, index: number, start: number, end: number) => void;
  onToggleDayOff: (dayIndex: number) => void;
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
        <div className="max-h-[560px] min-w-[720px] overflow-y-auto">
          <div className="sticky top-0 z-20 grid border-b bg-card" style={{ gridTemplateColumns: GRID_COLS }}>
            <div className="flex flex-col items-center justify-center gap-0.5 px-1 py-2 text-center leading-none text-muted-foreground">
              <span className="text-[11px] font-semibold text-foreground">15m</span>
              <span className="text-[8px]">/ row</span>
            </div>
            {WEEKDAY_LABELS.map((label, d) => {
              const isOff = daysOff.includes(d);
              const date = addDays(weekStart, d);
              const focused = focusedDay === d;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => onFocusDay(d)}
                  className={cn(
                    "relative flex cursor-pointer flex-col items-center gap-0.5 border-l px-1 py-2 text-center transition-colors",
                    isOff ? "bg-orange-100/80" : "hover:bg-muted/50",
                    focused &&
                      "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary",
                  )}
                >
                  <div className="text-xs font-semibold text-foreground">{label}</div>
                  <div className="tabular text-[10px] text-muted-foreground">{format(date, "d MMM")}</div>
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
                      "absolute top-1 right-1 grid size-5 cursor-pointer place-items-center rounded-md transition-colors",
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
              {HOURS.map((h, i) => (
                <div
                  key={h}
                  className={cn(
                    "tabular absolute right-1.5 text-[10px] text-muted-foreground",
                    h === DAY_END_HOUR && "-translate-y-full",
                  )}
                  style={{ top: i * 4 * SLOT_PX }}
                >
                  {String(h === 24 ? 0 : h).padStart(2, "0")}:00
                </div>
              ))}
            </div>

            {WEEKDAY_LABELS.map((label, d) => (
              <DayColumn
                key={label}
                dayIndex={d}
                day={days[d]}
                config={config}
                activeBlockType={activeBlockType}
                offending={offendingFor(d)}
                focused={focusedDay === d}
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
        Each day has its own schedule. Click a heading to check its rules; use the sun/moon to switch a
        day off.
      </div>
    </div>
  );
}
