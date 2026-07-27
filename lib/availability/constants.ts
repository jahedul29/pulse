import type { RuleConfig } from "./types";

export const DAY_START_HOUR = 6;
export const DAY_END_HOUR = 24;
export const SLOT_MINS = 15;
export const SLOTS_PER_DAY = ((DAY_END_HOUR - DAY_START_HOUR) * 60) / SLOT_MINS;

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function slotToMinutes(slot: number): number {
  return DAY_START_HOUR * 60 + slot * SLOT_MINS;
}

export function slotToTime(slot: number): string {
  const total = slotToMinutes(slot);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function minutesToSlot(mins: number): number {
  return Math.round((mins - DAY_START_HOUR * 60) / SLOT_MINS);
}

export function fmtDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export const THERAPIST_DEFAULTS: RuleConfig = {
  specialist: "therapist",
  minBlockInPersonMins: 60,
  minBlockOnlineMins: 60,
  minBreakMins: 45,
  continuousWindowMins: 360,
  maxDaysOff: 2,
  travelTimeMins: 45,
  minAdjacentUnavailMins: 15,
  supportsOnline: false,
};

export const ANALYST_DEFAULTS: RuleConfig = {
  specialist: "analyst",
  minBlockInPersonMins: 60,
  minBlockOnlineMins: 30,
  minBreakMins: 15,
  continuousWindowMins: 180,
  maxDaysOff: 2,
  travelTimeMins: 0,
  minAdjacentUnavailMins: 15,
  supportsOnline: true,
};
