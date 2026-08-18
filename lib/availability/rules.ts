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

export function setAvailable(day: DayState, start: number, end: number): DayState {
  const s = Math.max(0, Math.min(start, end));
  const e = Math.min(SLOTS_PER_DAY, Math.max(start, end));
  return { blocks: clearSpan(day.blocks, s, e) };
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
const slotsOf = (r: { start: number; end: number }): number[] =>
  Array.from({ length: r.end - r.start }, (_, k) => r.start + k);

export function cycleStatus(current: "available" | "unavailable" | "online", supportsOnline: boolean) {
  if (current === "available") return "unavailable" as const;
  if (current === "unavailable") return supportsOnline ? ("online" as const) : ("available" as const);
  return "available" as const;
}

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
      labelKey: config.supportsOnline
        ? "availability.rule.minBlockInpersonLabel"
        : "availability.rule.minBlockAnyLabel",
      pass: short.length === 0,
      actual: inPersonRuns.length
        ? `shortest ${fmtDuration(shortest)}`
        : config.supportsOnline
          ? "no in-person availability"
          : "no availability yet",
      message: `Each ${config.supportsOnline ? "in-person " : ""}availability block must be at least ${fmtDuration(config.minBlockInPersonMins)}.`,
      messageKey: config.supportsOnline
        ? "availability.rule.minBlockInpersonMsg"
        : "availability.rule.minBlockAnyMsg",
      values: { dur: fmtDuration(config.minBlockInPersonMins) },
      offending: short.flatMap(slotsOf),
    });
  }

  if (config.supportsOnline) {
    const onlineRuns = runsWhere(st, (v) => v === ONLINE);
    const short = onlineRuns.filter((r) => runMins(r) < config.minBlockOnlineMins);
    const shortest = onlineRuns.length ? Math.min(...onlineRuns.map(runMins)) : 0;
    results.push({
      id: "online-block",
      label: "Online-only availability block",
      labelKey: "availability.rule.onlineLabel",
      pass: short.length === 0,
      actual: onlineRuns.length ? `shortest ${fmtDuration(shortest)}` : "none set",
      message: `Each online-only availability block must be at least ${fmtDuration(config.minBlockOnlineMins)}.`,
      messageKey: "availability.rule.onlineMsg",
      values: { dur: fmtDuration(config.minBlockOnlineMins) },
      offending: short.flatMap(slotsOf),
    });
  }

  {
    const offending: number[] = [];
    let minInterior = Infinity;
    day.blocks.forEach((b) => {
      if (b.kind !== "unavailable") return;
      const isEdge = b.start === 0 || b.end === SLOTS_PER_DAY;
      const req = isEdge ? config.minAdjacentUnavailMins : config.minBreakMins;
      const mins = (b.end - b.start) * SLOT_MINS;
      if (!isEdge) minInterior = Math.min(minInterior, mins);
      if (mins < req) for (let s = b.start; s < b.end; s++) offending.push(s);
    });
    results.push({
      id: "breaks",
      label: config.specialist === "therapist" ? "Break ≥ travel time" : "Break between availability",
      labelKey:
        config.specialist === "therapist"
          ? "availability.rule.breakTherapistLabel"
          : "availability.rule.breakAnalystLabel",
      pass: offending.length === 0,
      actual: minInterior === Infinity ? "no breaks" : `shortest ${fmtDuration(minInterior)}`,
      message: `Breaks between availability must be\nat least ${fmtDuration(config.minBreakMins)}${
        config.specialist === "therapist" ? " (your travel time)" : ""
      }.\nEdges may be ${fmtDuration(config.minAdjacentUnavailMins)}.`,
      messageKey:
        config.specialist === "therapist"
          ? "availability.rule.breakTherapistMsg"
          : "availability.rule.breakAnalystMsg",
      values: {
        brk: fmtDuration(config.minBreakMins),
        edge: fmtDuration(config.minAdjacentUnavailMins),
      },
      offending,
    });
  }

  if (opts.isWorkday) {
    const longest = availableRuns.length ? Math.max(...availableRuns.map(runMins)) : 0;
    results.push({
      id: "window",
      label: "Continuous availability window",
      labelKey: "availability.rule.windowLabel",
      pass: longest >= config.continuousWindowMins,
      actual: `${fmtDuration(longest)} open`,
      message: `Workdays need one continuous availability window of at least ${fmtDuration(config.continuousWindowMins)}.`,
      messageKey: "availability.rule.windowMsg",
      values: { dur: fmtDuration(config.continuousWindowMins) },
    });
  }

  return results;
}
