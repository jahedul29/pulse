import type { SpecialistType } from "@/lib/availability/types";

export type AnnualStatus = "available" | "unavailable";

export interface AnnualConfig {
  specialist: SpecialistType;
  maxDaysOff: number;
  maxConsecutive: number;
  minGapWeeks: number;
}

export interface AnnualRuleResult {
  id: string;
  label: string;
  pass: boolean;
  message: string;
  messageKey: string;
  values?: Record<string, string | number>;
  offending?: string[];
}
