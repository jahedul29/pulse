export type SpecialistType = "therapist" | "analyst";

export type BlockType = "in_person" | "online";

export interface Block {
  start: number;
  end: number;
  type: BlockType;
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
