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
        <div className="sticky top-0 z-10 mb-1.5">
        <div
          className={cn(
            "grid gap-0.5 overflow-hidden rounded-full bg-card shadow-md ring-1 ring-foreground/5 sm:gap-1",
            COLS,
          )}
        >
          <div />
          {weekdays.map((label, d) => {
            const isOff = daysOff.includes(d);
            const base =
              "py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide transition-colors md:text-base";
            return (
              <button
                key={d}
                type="button"
                onClick={() => onToggleDayOff(d)}
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

          {WEEKDAY_LABELS.map((_, d) => (
            <DayColumn
              key={d}
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
