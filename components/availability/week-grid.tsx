"use client";

import { cn } from "@/lib/utils";
import { SLOTS_PER_DAY, WEEKDAY_LABELS, slotToTime } from "@/lib/availability/constants";
import { validateDay } from "@/lib/availability/rules";
import type { DayState, PaintStatus, RuleConfig } from "@/lib/availability/types";
import { DayColumn } from "./day-column";

const COLS =
  "grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] sm:grid-cols-[6.5rem_repeat(7,minmax(0,1fr))]";
const EMPTY = new Set<number>();

export function WeekGrid({
  days,
  daysOff,
  config,
  showViolations,
  shakeCols,
  shakeNonce,
  onPaint,
  onToggleDayOff,
}: {
  days: DayState[];
  daysOff: number[];
  config: RuleConfig;
  showViolations: boolean;
  shakeCols: number[];
  shakeNonce: number;
  onPaint: (dayIndex: number, start: number, end: number, status: PaintStatus) => void;
  onToggleDayOff: (dayIndex: number) => void;
}) {
  const offendingFor = (d: number): Set<number> => {
    if (!showViolations) return EMPTY;
    const results = validateDay(days[d], config, { isWorkday: !daysOff.includes(d) });
    const set = new Set<number>();
    for (const r of results) r.offending?.forEach((s) => set.add(s));
    return set;
  };

  return (
    <div className="px-1 pb-1">
      <div>
        <div
          className={cn(
            "sticky top-16 z-10 mb-1.5 grid gap-0.5 rounded-sm bg-card py-1 shadow-md ring-1 ring-foreground/5 sm:gap-1",
            COLS,
          )}
        >
          <div />
          {WEEKDAY_LABELS.map((label, d) => {
            const isOff = daysOff.includes(d);
            const weekend = d === 5 || d === 6;
            const base =
              "mx-0.5 rounded-sm py-1 text-center text-xs font-bold uppercase tracking-wide transition-colors sm:mx-1 sm:text-base";
            if (weekend) {
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => onToggleDayOff(d)}
                  title={isOff ? "Set as working day" : "Mark day off"}
                  className={cn(
                    base,
                    "cursor-pointer",
                    isOff ? "bg-[#e8134e] text-white" : "text-violet-700 hover:bg-violet-50",
                  )}
                >
                  {label.slice(0, 2)}
                </button>
              );
            }
            return (
              <div key={label} className={cn(base, "text-violet-700")}>
                {label.slice(0, 2)}
              </div>
            );
          })}
        </div>

        <div className={cn("grid [--slot:18px] sm:[--slot:26px]", COLS)}>
          <div className="relative" style={{ height: `calc(var(--slot) * ${SLOTS_PER_DAY})` }}>
            {Array.from({ length: SLOTS_PER_DAY }, (_, i) => (
              <div
                key={i}
                className="tabular absolute inset-x-0 flex items-center pl-0.5 text-[8px] leading-none font-medium text-violet-700 sm:pl-1 sm:text-[11px]"
                style={{ top: `calc(var(--slot) * ${i})`, height: "var(--slot)" }}
              >
                {slotToTime(i)} - {slotToTime(i + 1)}
              </div>
            ))}
          </div>

          {WEEKDAY_LABELS.map((label, d) => (
            <DayColumn
              key={label}
              dayIndex={d}
              day={days[d]}
              config={config}
              offending={offendingFor(d)}
              shakeKey={shakeCols.includes(d) ? shakeNonce : 0}
              onPaint={onPaint}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
