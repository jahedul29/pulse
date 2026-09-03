"use client";

import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { SLOTS_PER_DAY, WEEKDAY_LABELS, slotToTime } from "@/lib/availability/constants";
import { validateDay } from "@/lib/availability/rules";
import { weekdayShortLabels } from "@/lib/i18n/calendar";
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
  const locale = useLocale();
  const weekdays = weekdayShortLabels(locale);
  const offendingFor = (dayIndex: number): Set<number> => {
    if (!showViolations) return EMPTY;
    const results = validateDay(days[dayIndex], config, { isWorkday: !daysOff.includes(dayIndex) });
    const set = new Set<number>();
    for (const result of results) result.offending?.forEach((slot) => set.add(slot));
    return set;
  };

  return (
    <div className="px-1 pb-1">
      <div>
        <div className="sticky top-0 z-10 mb-1.5">
        <div
          className={cn(
            "grid gap-0.5 overflow-hidden rounded-full bg-card shadow-md ring-1 ring-foreground/5 sm:gap-1",
            COLS,
          )}
        >
          <div />
          {weekdays.map((label, dayIndex) => {
            const isOff = daysOff.includes(dayIndex);
            const base =
              "py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide transition-colors md:text-base";
            return (
              <button
                key={dayIndex}
                type="button"
                onClick={() => onToggleDayOff(dayIndex)}
                className={cn(
                  base,
                  "cursor-pointer",
                  isOff ? "bg-danger text-danger-foreground" : "text-primary hover:bg-primary/10",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
        </div>

        <div className={cn("grid [--slot:18px] sm:[--slot:26px]", COLS)}>
          <div className="relative" style={{ height: `calc(var(--slot) * ${SLOTS_PER_DAY})` }}>
            {Array.from({ length: SLOTS_PER_DAY }, (_, i) => (
              <div
                key={i}
                className="tabular absolute inset-x-0 flex items-center ps-0.5 text-[8px] leading-none text-primary sm:ps-1 md:text-[11px]"
                style={{ top: `calc(var(--slot) * ${i})`, height: "var(--slot)" }}
              >
                {slotToTime(i)} - {slotToTime(i + 1)}
              </div>
            ))}
          </div>

          {WEEKDAY_LABELS.map((_, dayIndex) => (
            <DayColumn
              key={dayIndex}
              dayIndex={dayIndex}
              day={days[dayIndex]}
              config={config}
              offending={offendingFor(dayIndex)}
              shakeKey={shakeCols.includes(dayIndex) ? shakeNonce : 0}
              onPaint={onPaint}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
