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
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function fmtDuration(mins: number): string {
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  return `${minutes}m`;
}

export const THERAPIST_DEFAULTS: RuleConfig = {
  specialist: "therapist",
  minBlockInPersonMins: 60,
  minBlockOnlineMins: 60,
  minBreakMins: 0,
  continuousWindowMins: 360,
  maxDaysOff: 2,
  travelTimeMins: 0,
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
