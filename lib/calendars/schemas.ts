import {
  DEFAULT_RULE_LIMITS,
  validateAnnualRules,
  validateWeeklyRules,
  type RuleIssue,
  type RuleIssueCode,
} from "@abapro-front-end/calendars";
import { z } from "zod";

export const NUMBER_LIMITS = {
  maxDaysOff: DEFAULT_RULE_LIMITS.maxDaysOffPerWeek,
  maxDaysOffPerYear: DEFAULT_RULE_LIMITS.maxDaysOffPerYear,
  maxConsecutiveDays: DEFAULT_RULE_LIMITS.maxConsecutiveDays,
  minGapWeeks: DEFAULT_RULE_LIMITS.maxGapWeeks,
} as const;
export type CountKey = keyof typeof NUMBER_LIMITS;

export type ParameterMessages = Record<RuleIssueCode | "mustBeNumber", string>;

export const PARAMETER_ISSUES: ParameterMessages = {
  mustBeNumber: "mustBeNumber",
  wholeNumber: "wholeNumber",
  minutesRange: "minutesRange",
  daysPerWeek: "daysPerWeek",
  daysPerYear: "daysPerYear",
  weeksRange: "weeksRange",
  travelRange: "travelRange",
  windowTooShort: "windowTooShort",
  travelEmpty: "travelEmpty",
  travelDuplicate: "travelDuplicate",
};

export function roleParametersSchemaFor(messages: ParameterMessages) {
  const number = () => z.number({ error: messages.mustBeNumber });
  const report = (ctx: z.RefinementCtx, scope: "weekly" | "annual", issues: RuleIssue[]) =>
    issues.forEach((issue) => ctx.addIssue({ code: "custom", path: [scope, ...issue.path], message: messages[issue.code] }));
  return z
    .object({
      weekly: z.object({
        minBlockInPersonMins: number(),
        minBlockOnlineMins: number(),
        minBreakMins: number(),
        continuousWindowMins: number(),
        maxDaysOff: number(),
        minAdjacentUnavailMins: number(),
        supportsOnline: z.boolean(),
        mirrorWorkdays: z.boolean(),
        travelTime: z.object({ required: z.boolean(), options: z.array(number()) }).nullable(),
      }),
      annual: z.object({
        maxDaysOffPerYear: number(),
        maxConsecutiveDays: number(),
        minGapWeeks: number(),
      }),
    })
    .superRefine((rules, ctx) => {
      report(ctx, "weekly", validateWeeklyRules(rules.weekly));
      report(ctx, "annual", validateAnnualRules(rules.annual));
    });
}

export function calendarParametersSchemaFor(messages: ParameterMessages) {
  const role = roleParametersSchemaFor(messages);
  return z.object({ therapist: role, analyst: role });
}

export function specialistParametersFormSchemaFor(messages: ParameterMessages) {
  return z.object({
    values: roleParametersSchemaFor(messages),
    custom: z.object({
      weekly: z.record(z.string(), z.boolean()),
      annual: z.record(z.string(), z.boolean()),
    }),
  });
}

export type SpecialistParametersForm = z.infer<ReturnType<typeof specialistParametersFormSchemaFor>>;
