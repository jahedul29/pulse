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
  return [...blocks].sort((blockA, blockB) => blockA.start - blockB.start);
}

function clearSpan(blocks: Block[], spanStart: number, spanEnd: number): Block[] {
  const out: Block[] = [];
  for (const block of blocks) {
    if (block.end <= spanStart || block.start >= spanEnd) {
      out.push(block);
      continue;
    }
    if (block.start < spanStart) out.push({ ...block, end: spanStart });
    if (block.end > spanEnd) out.push({ ...block, start: spanEnd });
  }
  return out;
}

function mergeSameKind(blocks: Block[]): Block[] {
  const sorted = sortBlocks(blocks).filter((block) => block.end > block.start);
  const out: Block[] = [];
  for (const block of sorted) {
    const last = out[out.length - 1];
    if (last && last.kind === block.kind && block.start <= last.end) {
      last.end = Math.max(last.end, block.end);
    } else {
      out.push({ ...block });
    }
  }
  return out;
}

export function addBlock(day: DayState, draft: Block): DayState {
  const start = Math.max(0, Math.min(draft.start, draft.end));
  let end = Math.min(SLOTS_PER_DAY, Math.max(draft.start, draft.end));
  if (end <= start) end = Math.min(SLOTS_PER_DAY, start + 1);
  const cleared = clearSpan(day.blocks, start, end);
  return { blocks: mergeSameKind([...cleared, { start, end, kind: draft.kind }]) };
}

export function setAvailable(day: DayState, start: number, end: number): DayState {
  const clampedStart = Math.max(0, Math.min(start, end));
  const clampedEnd = Math.min(SLOTS_PER_DAY, Math.max(start, end));
  return { blocks: clearSpan(day.blocks, clampedStart, clampedEnd) };
}

const AVAILABLE = 0;
const ONLINE = 1;
const UNAVAIL = 2;

function buildStates(day: DayState): Uint8Array {
  const states = new Uint8Array(SLOTS_PER_DAY);
  for (const block of day.blocks) {
    const stateValue = block.kind === "unavailable" ? UNAVAIL : ONLINE;
    for (let slot = block.start; slot < block.end && slot < SLOTS_PER_DAY; slot++)
      states[slot] = stateValue;
  }
  return states;
}

function runsWhere(
  states: Uint8Array,
  pred: (value: number) => boolean,
): Array<{ start: number; end: number }> {
  const out: Array<{ start: number; end: number }> = [];
  let cur = -1;
  for (let slot = 0; slot < states.length; slot++) {
    if (pred(states[slot])) {
      if (cur < 0) cur = slot;
    } else if (cur >= 0) {
      out.push({ start: cur, end: slot });
      cur = -1;
    }
  }
  if (cur >= 0) out.push({ start: cur, end: states.length });
  return out;
}

const runMins = (run: { start: number; end: number }) => (run.end - run.start) * SLOT_MINS;
const slotsOf = (run: { start: number; end: number }): number[] =>
  Array.from({ length: run.end - run.start }, (_, index) => run.start + index);

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
  const states = buildStates(day);
  const inPersonRuns = runsWhere(states, (state) => state === AVAILABLE);
  const availableRuns = runsWhere(states, (state) => state !== UNAVAIL);
  const results: RuleResult[] = [];

  {
    const short = inPersonRuns.filter((run) => runMins(run) < config.minBlockInPersonMins);
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
    const onlineRuns = runsWhere(states, (state) => state === ONLINE);
    const short = onlineRuns.filter((run) => runMins(run) < config.minBlockOnlineMins);
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
    day.blocks.forEach((block) => {
      if (block.kind !== "unavailable") return;
      const isEdge = block.start === 0 || block.end === SLOTS_PER_DAY;
      const req = isEdge ? config.minAdjacentUnavailMins : config.minBreakMins;
      const mins = (block.end - block.start) * SLOT_MINS;
      if (!isEdge) minInterior = Math.min(minInterior, mins);
      if (mins < req) for (let slot = block.start; slot < block.end; slot++) offending.push(slot);
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
