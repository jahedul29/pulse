import type { AnnualRules, WeeklyRules } from "@abapro-front-end/calendars";
import type { SpecialistType } from "@/lib/specialists";

export const WEEKLY_RULES: Record<SpecialistType, WeeklyRules> = {
  therapist: {
    minBlockInPersonMins: 60,
    minBlockOnlineMins: 60,
    minBreakMins: 15,
    continuousWindowMins: 360,
    maxDaysOff: 2,
    minAdjacentUnavailMins: 15,
    supportsOnline: false,
    mirrorWorkdays: true,
    travelTime: { required: true, options: [45, 60, 75, 90, 105] },
  },
  analyst: {
    minBlockInPersonMins: 60,
    minBlockOnlineMins: 30,
    minBreakMins: 15,
    continuousWindowMins: 180,
    maxDaysOff: 2,
    minAdjacentUnavailMins: 15,
    supportsOnline: true,
    mirrorWorkdays: true,
    travelTime: null,
  },
};

export const ANNUAL_RULES: Record<SpecialistType, AnnualRules> = {
  therapist: { maxDaysOffPerYear: 56, maxConsecutiveDays: 56, minGapWeeks: 0 },
  analyst: { maxDaysOffPerYear: 56, maxConsecutiveDays: 28, minGapWeeks: 4 },
};
