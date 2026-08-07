export type SpecialistType = "therapist" | "analyst";

export type MarkKind = "unavailable" | "online";

export type PaintStatus = "available" | "unavailable" | "online";

export interface Block {
  start: number;
  end: number;
  kind: MarkKind;
}

export interface DayState {
  blocks: Block[];
}

export interface RuleConfig {
  specialist: SpecialistType;
  minBlockInPersonMins: number;
  minBlockOnlineMins: number;
  minBreakMins: number;
  continuousWindowMins: number;
  maxDaysOff: number;
  travelTimeMins: number;
  minAdjacentUnavailMins: number;
  supportsOnline: boolean;
}

export interface RuleResult {
  id: string;
  label: string;
  pass: boolean;
  actual: string;
  message: string;
  offending?: number[];
}
