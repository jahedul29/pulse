import type {
  Block,
  DayState,
  RuleConfig,
  RuleResult,
  SpecialistType,
} from "./types";
import {
  ANALYST_DEFAULTS,
  fmtDuration,
  SLOT_MINS,
  SLOTS_PER_DAY,
  THERAPIST_DEFAULTS,
} from "./constants";

export function configFor(type: SpecialistType): RuleConfig {
  return type === "therapist" ? { ...THERAPIST_DEFAULTS } : { ...ANALYST_DEFAULTS };
}

function sortBlocks(blocks: Block[]): Block[] {
  return [...blocks].sort((a, b) => a.start - b.start);
}

function clearSpan(blocks: Block[], s: number, e: number): Block[] {
  const out: Block[] = [];
  for (const b of blocks) {
    if (b.end <= s || b.start >= e) {
      out.push(b);
      continue;
    }
    if (b.start < s) out.push({ ...b, end: s });
    if (b.end > e) out.push({ ...b, start: e });
  }
  return out;
}

function mergeSameKind(blocks: Block[]): Block[] {
  const sorted = sortBlocks(blocks).filter((b) => b.end > b.start);
  const out: Block[] = [];
  for (const b of sorted) {
    const last = out[out.length - 1];
    if (last && last.kind === b.kind && b.start <= last.end) {
      last.end = Math.max(last.end, b.end);
    } else {
      out.push({ ...b });
    }
  }
  return out;
}

export function addBlock(day: DayState, draft: Block): DayState {
  const s = Math.max(0, Math.min(draft.start, draft.end));
  let e = Math.min(SLOTS_PER_DAY, Math.max(draft.start, draft.end));
  if (e <= s) e = Math.min(SLOTS_PER_DAY, s + 1);
  const cleared = clearSpan(day.blocks, s, e);
  return { blocks: mergeSameKind([...cleared, { start: s, end: e, kind: draft.kind }]) };
}

export function removeBlock(day: DayState, index: number): DayState {
  return { blocks: day.blocks.filter((_, i) => i !== index) };
}

export function resizeBlock(day: DayState, index: number, start: number, end: number): DayState {
  const b = day.blocks[index];
  if (!b) return day;
  return addBlock(removeBlock(day, index), { start, end, kind: b.kind });
}

export function placeMinUnavailable(
  day: DayState,
  selStart: number,
  selEnd: number,
  config: RuleConfig,
): { start: number; end: number } {
  const T = Math.max(1, Math.round(config.minBreakMins / SLOT_MINS));
  const s0 = Math.max(0, Math.min(selStart, selEnd));
  const e0 = Math.min(SLOTS_PER_DAY, Math.max(selStart, selEnd));

  const st = buildStates(day);
  const run = runsWhere(st, (v) => v !== UNAVAIL).find((r) => r.start < e0 && r.end > s0);
  if (!run) {
    const start = Math.max(0, Math.min(s0, SLOTS_PER_DAY - T));
    return { start, end: start + T };
  }

  const { start: A, end: B } = run;
  if (B - A <= T) return { start: A, end: B };

  const MAB = Math.round(config.minBlockInPersonMins / SLOT_MINS);
  const lo = Math.max(A, e0 - T);
  const hi = Math.min(s0, B - T);
  let best = lo;
  let bestScore = -1;
  for (let s = lo; s <= hi; s++) {
    const above = s - A;
    const below = B - (s + T);
    const score = (above >= MAB ? above : 0) + (below >= MAB ? below : 0);
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }
  return { start: best, end: best + T };
}

export function blockSubMinAvailability(day: DayState, config: RuleConfig): DayState {
  let result = day;
  for (let guard = 0; guard < 8; guard++) {
    const st = buildStates(result);
    let changed = false;
    for (const r of runsWhere(st, (v) => v === AVAILABLE)) {
      if ((r.end - r.start) * SLOT_MINS < config.minBlockInPersonMins) {
        result = addBlock(result, { start: r.start, end: r.end, kind: "unavailable" });
        changed = true;
      }
    }
    if (config.supportsOnline) {
      for (const r of runsWhere(st, (v) => v === ONLINE)) {
        if ((r.end - r.start) * SLOT_MINS < config.minBlockOnlineMins) {
          result = addBlock(result, { start: r.start, end: r.end, kind: "unavailable" });
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
  return result;
}

const AVAILABLE = 0;
const ONLINE = 1;
const UNAVAIL = 2;

function buildStates(day: DayState): Uint8Array {
  const st = new Uint8Array(SLOTS_PER_DAY);
  for (const b of day.blocks) {
    const v = b.kind === "unavailable" ? UNAVAIL : ONLINE;
    for (let s = b.start; s < b.end && s < SLOTS_PER_DAY; s++) st[s] = v;
  }
  return st;
}

function runsWhere(st: Uint8Array, pred: (v: number) => boolean): Array<{ start: number; end: number }> {
  const out: Array<{ start: number; end: number }> = [];
  let cur = -1;
  for (let s = 0; s < st.length; s++) {
    if (pred(st[s])) {
      if (cur < 0) cur = s;
    } else if (cur >= 0) {
      out.push({ start: cur, end: s });
      cur = -1;
    }
  }
  if (cur >= 0) out.push({ start: cur, end: st.length });
  return out;
}

const runMins = (r: { start: number; end: number }) => (r.end - r.start) * SLOT_MINS;

export function validateDay(
  day: DayState,
  config: RuleConfig,
  opts: { isWorkday: boolean },
): RuleResult[] {
  const st = buildStates(day);
  const inPersonRuns = runsWhere(st, (v) => v === AVAILABLE);
  const availableRuns = runsWhere(st, (v) => v !== UNAVAIL);
  const results: RuleResult[] = [];

  {
    const short = inPersonRuns.filter((r) => runMins(r) < config.minBlockInPersonMins);
    const shortest = inPersonRuns.length ? Math.min(...inPersonRuns.map(runMins)) : 0;
    results.push({
      id: "min-block",
      label: config.supportsOnline ? "In-person availability block" : "Minimum availability block",
      pass: short.length === 0,
      actual: inPersonRuns.length
        ? `shortest ${fmtDuration(shortest)}`
        : config.supportsOnline
          ? "no in-person availability"
          : "no availability yet",
      message: `Each ${config.supportsOnline ? "in-person " : ""}availability block must be at least ${fmtDuration(config.minBlockInPersonMins)}.`,
    });
  }

  if (config.supportsOnline) {
    const onlineRuns = runsWhere(st, (v) => v === ONLINE);
    const short = onlineRuns.filter((r) => runMins(r) < config.minBlockOnlineMins);
    const shortest = onlineRuns.length ? Math.min(...onlineRuns.map(runMins)) : 0;
    results.push({
      id: "online-block",
      label: "Online-only availability block",
      pass: short.length === 0,
      actual: onlineRuns.length ? `shortest ${fmtDuration(shortest)}` : "none set",
      message: `Each online-only availability block must be at least ${fmtDuration(config.minBlockOnlineMins)}.`,
    });
  }

  {
    const offending: number[] = [];
    let minInterior = Infinity;
    day.blocks.forEach((b, i) => {
      if (b.kind !== "unavailable") return;
      const isEdge = b.start === 0 || b.end === SLOTS_PER_DAY;
      const req = isEdge ? config.minAdjacentUnavailMins : config.minBreakMins;
      const mins = (b.end - b.start) * SLOT_MINS;
      if (!isEdge) minInterior = Math.min(minInterior, mins);
      if (mins < req) offending.push(i);
    });
    results.push({
      id: "breaks",
      label: config.specialist === "therapist" ? "Break ≥ travel time" : "Break between availability",
      pass: offending.length === 0,
      actual: minInterior === Infinity ? "no breaks" : `shortest ${fmtDuration(minInterior)}`,
      message: `Breaks between availability must be at least ${fmtDuration(config.minBreakMins)}${
        config.specialist === "therapist" ? " (your travel time)" : ""
      }; edges may be ${fmtDuration(config.minAdjacentUnavailMins)}.`,
      offending,
    });
  }

  if (opts.isWorkday) {
    const longest = availableRuns.length ? Math.max(...availableRuns.map(runMins)) : 0;
    results.push({
      id: "window",
      label: "Continuous availability window",
      pass: longest >= config.continuousWindowMins,
      actual: `${fmtDuration(longest)} open`,
      message: `Workdays need one continuous availability window of at least ${fmtDuration(config.continuousWindowMins)}.`,
    });
  }

  return results;
}

export function dayPasses(
  day: DayState,
  config: RuleConfig,
  opts: { isWorkday: boolean },
): boolean {
  return validateDay(day, config, opts).every((r) => r.pass);
}

export function weekPasses(args: {
  days: DayState[];
  daysOff: number[];
  config: RuleConfig;
}): boolean {
  const { days, daysOff, config } = args;
  if (daysOff.length > config.maxDaysOff) return false;
  for (let d = 0; d < days.length; d++) {
    const isWorkday = !daysOff.includes(d);
    if (!dayPasses(days[d] ?? { blocks: [] }, config, { isWorkday })) return false;
  }
  return true;
}
