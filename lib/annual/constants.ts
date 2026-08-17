import type { SpecialistType } from "@/lib/availability/types";
import type { AnnualConfig } from "./types";

export const MONTH_LABELS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

export const WEEKDAY_LABELS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

export const ANNUAL_THERAPIST: AnnualConfig = {
  specialist: "therapist",
  maxDaysOff: 56,
  maxConsecutive: 0,
  minGapWeeks: 0,
};

export const ANNUAL_ANALYST: AnnualConfig = {
  specialist: "analyst",
  maxDaysOff: 56,
  maxConsecutive: 28,
  minGapWeeks: 4,
};

export function annualConfigFor(role: SpecialistType): AnnualConfig {
  return role === "analyst" ? ANNUAL_ANALYST : ANNUAL_THERAPIST;
}
