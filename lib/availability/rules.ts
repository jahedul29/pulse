import type {
  Block,
  BlockType,
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

const slotsToMins = (slots: number) => slots * SLOT_MINS;
const minsToSlots = (mins: number) => Math.round(mins / SLOT_MINS);

function minBlockMins(type: BlockType, config: RuleConfig): number {
  return type === "online" ? config.minBlockOnlineMins : config.minBlockInPersonMins;
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

function mergeSameType(blocks: Block[]): Block[] {
  const sorted = sortBlocks(blocks).filter((b) => b.end > b.start);
  const out: Block[] = [];
  for (const b of sorted) {
    const last = out[out.length - 1];
    if (last && last.type === b.type && b.start <= last.end) {
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
  return { blocks: mergeSameType([...cleared, { start: s, end: e, type: draft.type }]) };
}

export function removeBlock(day: DayState, index: number): DayState {
  return { blocks: day.blocks.filter((_, i) => i !== index) };
}

export function resizeBlock(day: DayState, index: number, start: number, end: number): DayState {
  const b = day.blocks[index];
  if (!b) return day;
  return addBlock(removeBlock(day, index), { start, end, type: b.type });
}

export function blockMins(block: Block): number {
  return slotsToMins(block.end - block.start);
}

// Largest contiguous stretch of the day that could still hold a continuous
// availability window — i.e. the day minus the committed breaks (gaps between
// two availability blocks). Empty edges and empty middle count as room, so an
// empty or partly-filled day still passes; only fragmenting the day with breaks
// below the required window makes it fail.
function maxOpenWindowMins(sorted: Block[]): number {
  if (sorted.length === 0) return SLOTS_PER_DAY * SLOT_MINS;
  const blocked = new Array<boolean>(SLOTS_PER_DAY).fill(false);
  for (let i = 1; i < sorted.length; i++) {
    for (let s = sorted[i - 1].end; s < sorted[i].start; s++) blocked[s] = true;
  }
  let longest = 0;
  let cur = 0;
  for (let s = 0; s < SLOTS_PER_DAY; s++) {
    if (!blocked[s]) {
      cur++;
      if (cur > longest) longest = cur;
    } else {
      cur = 0;
    }
  }
  return slotsToMins(longest);
}

export function validateDay(
  day: DayState,
  config: RuleConfig,
  opts: { isWorkday: boolean },
): RuleResult[] {
  const blocks = sortBlocks(day.blocks);
  const results: RuleResult[] = [];

  const tooShort: number[] = [];
  let smallest = Infinity;
  blocks.forEach((b, i) => {
    const mins = blockMins(b);
    smallest = Math.min(smallest, mins);
    if (mins < minBlockMins(b.type, config)) tooShort.push(i);
  });
  const minReq = config.supportsOnline
    ? `${fmtDuration(config.minBlockInPersonMins)} in-person / ${fmtDuration(config.minBlockOnlineMins)} online`
    : fmtDuration(config.minBlockInPersonMins);
  results.push({
    id: "min-block",
    label: "Minimum block length",
    pass: tooShort.length === 0,
    actual: blocks.length ? `shortest ${fmtDuration(smallest)}` : "no blocks yet",
    message: `Each availability block must be at least ${minReq}.`,
    offending: tooShort,
  });

  const badGaps = new Set<number>();
  let minGap = Infinity;
  for (let i = 1; i < blocks.length; i++) {
    const gap = slotsToMins(blocks[i].start - blocks[i - 1].end);
    if (gap <= 0) continue;
    minGap = Math.min(minGap, gap);
    if (gap < config.minBreakMins) {
      badGaps.add(i - 1);
      badGaps.add(i);
    }
  }
  results.push({
    id: "breaks",
    label: config.specialist === "therapist" ? "Break ≥ travel time" : "Break between blocks",
    pass: badGaps.size === 0,
    actual: minGap === Infinity ? "no breaks" : `shortest ${fmtDuration(minGap)}`,
    message: `Breaks between availability blocks must be at least ${fmtDuration(config.minBreakMins)}${
      config.specialist === "therapist" ? " (your travel time)" : ""
    }.`,
    offending: [...badGaps],
  });

  if (opts.isWorkday) {
    const room = maxOpenWindowMins(blocks);
    results.push({
      id: "window",
      label: "Continuous availability window",
      pass: room >= config.continuousWindowMins,
      actual: `${fmtDuration(room)} open`,
      message: `Keep room for one continuous window of at least ${fmtDuration(config.continuousWindowMins)} — breaks can't fragment the day below it.`,
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
