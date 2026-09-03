import { addDays, differenceInCalendarDays, endOfWeek, parseISO, startOfWeek } from "date-fns";
import type { AnnualConfig, AnnualRuleResult } from "./types";

export function sortIso(dates: string[]): string[] {
  return [...dates].sort();
}

function diffDays(startIso: string, endIso: string): number {
  return differenceInCalendarDays(parseISO(endIso), parseISO(startIso));
}

export function groupConsecutive(dates: string[]): string[][] {
  const sorted = sortIso(dates);
  const groups: string[][] = [];
  for (const date of sorted) {
    const last = groups[groups.length - 1];
    if (last && diffDays(last[last.length - 1], date) === 1) last.push(date);
    else groups.push([date]);
  }
  return groups;
}

function fullWeeksBetween(aEndIso: string, bStartIso: string): number {
  const gapStart = addDays(parseISO(aEndIso), 1);
  const gapEnd = addDays(parseISO(bStartIso), -1);
  if (differenceInCalendarDays(gapEnd, gapStart) < 0) return 0;
  const weekMon = startOfWeek(gapStart, { weekStartsOn: 1 });
  const firstMon =
    differenceInCalendarDays(gapStart, weekMon) === 0 ? gapStart : addDays(weekMon, 7);
  const weekSun = endOfWeek(gapEnd, { weekStartsOn: 1 });
  const lastSun = differenceInCalendarDays(weekSun, gapEnd) === 0 ? gapEnd : addDays(weekSun, -7);
  const span = differenceInCalendarDays(lastSun, firstMon) + 1;
  return span >= 7 ? Math.floor(span / 7) : 0;
}

export function validateAnnual(offDates: string[], config: AnnualConfig): AnnualRuleResult[] {
  const results: AnnualRuleResult[] = [];

  const byYear = new Map<string, string[]>();
  for (const date of offDates) {
    const y = date.slice(0, 4);
    const list = byYear.get(y) ?? [];
    list.push(date);
    byYear.set(y, list);
  }
  const capFail: string[] = [];
  for (const list of byYear.values()) {
    if (list.length > config.maxDaysOff) capFail.push(...list);
  }
  results.push({
    id: "max-days-off",
    label: "Maximum days off",
    pass: capFail.length === 0,
    message: `You can select up to ${config.maxDaysOff} days off per year`,
    messageKey: "annual.rule.maxDaysOff",
    values: { max: config.maxDaysOff },
    offending: capFail,
  });

  const groups = groupConsecutive(offDates);

  if (config.maxConsecutive > 0) {
    const bad = groups.filter((group) => group.length > config.maxConsecutive).flat();
    results.push({
      id: "max-consecutive",
      label: "Maximum consecutive days off",
      pass: bad.length === 0,
      message: `You can take a maximum of ${config.maxConsecutive} consecutive days off`,
      messageKey: "annual.rule.maxConsecutive",
      values: { max: config.maxConsecutive },
      offending: bad,
    });
  }

  if (config.minGapWeeks > 0 && groups.length > 1) {
    const bad = new Set<string>();
    for (let i = 1; i < groups.length; i++) {
      const prev = groups[i - 1];
      const cur = groups[i];
      if (fullWeeksBetween(prev[prev.length - 1], cur[0]) < config.minGapWeeks) {
        for (const date of prev) bad.add(date);
        for (const date of cur) bad.add(date);
      }
    }
    results.push({
      id: "min-gap",
      label: "Interval between time-off blocks",
      pass: bad.size === 0,
      message: `Leave at least ${config.minGapWeeks} full calendar weeks (MO–SU) between non-consecutive days off`,
      messageKey: "annual.rule.minGap",
      values: { weeks: config.minGapWeeks },
      offending: Array.from(bad),
    });
  }

  return results;
}

export function firstFailure(
  offDates: string[],
  config: AnnualConfig,
): AnnualRuleResult | undefined {
  return validateAnnual(offDates, config).find((result) => !result.pass);
}

export function isPast(iso: string, todayIso: string): boolean {
  return iso < todayIso;
}
