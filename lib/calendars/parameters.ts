import {
  ANNUAL_NUMERIC_RULES,
  bypassAnnualRules,
  bypassWeeklyRules,
  DEFAULT_RULE_LIMITS,
  MINUTE_CHOICES,
  validateAnnualRules,
  validateWeeklyRules,
  WEEKLY_NUMERIC_RULES,
  type RuleIssue,
} from "@abapro-front-end/calendars";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useSpecialistStore, type SpecialistType } from "@/lib/specialists";
import { z } from "zod";
import { ANNUAL_RULES, WEEKLY_RULES } from "./presets";
import { PARAMETER_ISSUES, calendarParametersSchemaFor, roleParametersSchemaFor, type SpecialistParametersForm } from "./schemas";

export const WEEKLY_NUMERIC_KEYS = WEEKLY_NUMERIC_RULES;
export const ANNUAL_NUMERIC_KEYS = ANNUAL_NUMERIC_RULES;
export type WeeklyNumericKey = (typeof WEEKLY_NUMERIC_KEYS)[number];
export type WeeklyMinutesKey = Exclude<WeeklyNumericKey, "maxDaysOff">;
export type AnnualNumericKey = (typeof ANNUAL_NUMERIC_KEYS)[number];
export type NumericKey = WeeklyNumericKey | AnnualNumericKey;
export type CalendarKind = "weekly" | "annual";
export type ParameterPath = `weekly.${WeeklyNumericKey}` | `annual.${AnnualNumericKey}`;
export type ParameterUnit = "minutes" | "days" | "weeks";

export const PARAMETER_UNITS: Record<NumericKey, ParameterUnit> = {
  minBlockInPersonMins: "minutes",
  minBlockOnlineMins: "minutes",
  minBreakMins: "minutes",
  continuousWindowMins: "minutes",
  maxDaysOff: "days",
  minAdjacentUnavailMins: "minutes",
  maxDaysOffPerYear: "days",
  maxConsecutiveDays: "days",
  minGapWeeks: "weeks",
};

export const TRAVEL_CHOICES = MINUTE_CHOICES.filter((minutes) => minutes <= DEFAULT_RULE_LIMITS.maxTravelMinutes);
export const DEFAULT_TRAVEL_OPTIONS = WEEKLY_RULES.therapist.travelTime?.options ?? [45, 60, 75, 90, 105];
export const ROLE_HAS_TRAVEL: Record<SpecialistType, boolean> = {
  therapist: WEEKLY_RULES.therapist.travelTime !== null,
  analyst: WEEKLY_RULES.analyst.travelTime !== null,
};
export const ROLE_SUPPORTS_ONLINE: Record<SpecialistType, boolean> = {
  therapist: WEEKLY_RULES.therapist.supportsOnline,
  analyst: WEEKLY_RULES.analyst.supportsOnline,
};
const FIXED_WEEKLY_KEYS = ["supportsOnline", "mirrorWorkdays"] as const;

export const CALENDAR_PARAMETERS_STORAGE_KEY = "abapro-calendar-settings";

export const roleParametersSchema = roleParametersSchemaFor(PARAMETER_ISSUES);
export const calendarParametersSchema = calendarParametersSchemaFor(PARAMETER_ISSUES);
export type CalendarParameters = z.infer<typeof calendarParametersSchema>;
export type RoleParameters = z.infer<typeof roleParametersSchema>;

export function travelRuleFor(role: SpecialistType, travelTime: RoleParameters["weekly"]["travelTime"] | undefined) {
  if (!ROLE_HAS_TRAVEL[role]) return null;
  return { required: true, options: travelTime?.options.length ? [...travelTime.options] : [...DEFAULT_TRAVEL_OPTIONS] };
}

export function withRoleRules(role: SpecialistType, parameters: RoleParameters): RoleParameters {
  return {
    ...parameters,
    weekly: {
      ...parameters.weekly,
      supportsOnline: WEEKLY_RULES[role].supportsOnline,
      mirrorWorkdays: WEEKLY_RULES[role].mirrorWorkdays,
      travelTime: travelRuleFor(role, parameters.weekly.travelTime),
    },
  };
}

function withRolesRules(parameters: CalendarParameters): CalendarParameters {
  return { therapist: withRoleRules("therapist", parameters.therapist), analyst: withRoleRules("analyst", parameters.analyst) };
}

export function defaultCalendarParameters(): CalendarParameters {
  return calendarParametersSchema.parse({
    therapist: { weekly: WEEKLY_RULES.therapist, annual: ANNUAL_RULES.therapist },
    analyst: { weekly: WEEKLY_RULES.analyst, annual: ANNUAL_RULES.analyst },
  });
}

export const specialistParametersSchema = z.object({
  weekly: z.object(roleParametersSchema.shape.weekly.shape).partial().optional(),
  annual: roleParametersSchema.shape.annual.partial().optional(),
});
export type SpecialistParameters = z.infer<typeof specialistParametersSchema>;
export type AdminRuleSwitches = Partial<Record<ParameterPath, false>>;
const switchKeys: ParameterPath[] = [...WEEKLY_NUMERIC_KEYS.map((key): ParameterPath => `weekly.${key}`), ...ANNUAL_NUMERIC_KEYS.map((key): ParameterPath => `annual.${key}`)];

export function resolveSpecialistParameters(global: CalendarParameters, role: SpecialistType, custom: SpecialistParameters = {}): RoleParameters {
  return withRoleRules(role, { weekly: { ...global[role].weekly, ...custom.weekly }, annual: { ...global[role].annual, ...custom.annual } });
}

export function adminCalendarParameters(parameters: RoleParameters, disabled: AdminRuleSwitches = {}): RoleParameters {
  return {
    weekly: bypassWeeklyRules(parameters.weekly, WEEKLY_NUMERIC_KEYS.filter((key) => disabled[`weekly.${key}`] === false)),
    annual: bypassAnnualRules(parameters.annual, ANNUAL_NUMERIC_KEYS.filter((key) => disabled[`annual.${key}`] === false)),
  };
}

export function sameParameters(first: unknown, second: unknown): boolean {
  if (Object.is(first, second)) return true;
  if (typeof first !== "object" || typeof second !== "object" || first === null || second === null) return false;
  if (Array.isArray(first) !== Array.isArray(second)) return false;
  const firstKeys = Object.keys(first);
  const secondKeys = Object.keys(second);
  if (firstKeys.length !== secondKeys.length) return false;
  return firstKeys.every(
    (key) =>
      Object.hasOwn(second, key) &&
      sameParameters((first as Record<string, unknown>)[key], (second as Record<string, unknown>)[key]),
  );
}

export function specialistFormValues(
  role: SpecialistType,
  resolved: RoleParameters,
  custom: SpecialistParameters = {},
): SpecialistParametersForm {
  const flags = (kind: CalendarKind, keys: readonly string[]) =>
    Object.fromEntries(keys.map((key) => [key, Object.hasOwn(custom[kind] ?? {}, key)]));
  const weeklyKeys = ROLE_HAS_TRAVEL[role] ? [...WEEKLY_NUMERIC_KEYS, "travelTime"] : [...WEEKLY_NUMERIC_KEYS];
  return {
    values: { weekly: { ...resolved.weekly }, annual: { ...resolved.annual } },
    custom: { weekly: flags("weekly", weeklyKeys), annual: flags("annual", ANNUAL_NUMERIC_KEYS) },
  };
}

export function normalizeOverride(role: SpecialistType | undefined, custom: SpecialistParameters): SpecialistParameters {
  if (!custom.weekly) return custom;
  const weekly = { ...custom.weekly };
  FIXED_WEEKLY_KEYS.forEach((key) => delete weekly[key]);
  if (role && Object.hasOwn(weekly, "travelTime")) {
    if (ROLE_HAS_TRAVEL[role]) weekly.travelTime = travelRuleFor(role, weekly.travelTime);
    else delete weekly.travelTime;
  }
  return { ...custom, weekly };
}

function roleOf(id: string): SpecialistType | undefined {
  return useSpecialistStore.getState().specialists.find((specialist) => specialist.id === id)?.role;
}

const savedRecord = z.record(z.string(), z.unknown());

function loadParameters(saved: unknown, fallback: CalendarParameters): CalendarParameters {
  const roles = z.object({ therapist: z.unknown(), analyst: z.unknown() }).partial().safeParse(saved);
  const load = (role: SpecialistType) => {
    const parsed = roleParametersSchema.safeParse(roles.success ? roles.data[role] : undefined);
    return withRoleRules(role, parsed.success ? parsed.data : fallback[role]);
  };
  return { therapist: load("therapist"), analyst: load("analyst") };
}

function withoutInvalidFields(
  role: SpecialistType,
  custom: SpecialistParameters,
  parameters: CalendarParameters,
): SpecialistParameters {
  const resolved = resolveSpecialistParameters(parameters, role, custom);
  const invalid = (issues: RuleIssue[]) =>
    new Set(issues.filter((issue) => issue.code !== "windowTooShort").map((issue) => issue.path[0]));
  const weeklyInvalid = invalid(validateWeeklyRules(resolved.weekly));
  const annualInvalid = invalid(validateAnnualRules(resolved.annual));
  const keep = <Values extends object>(values: Values | undefined, bad: Set<string>) => {
    const entries = Object.entries(values ?? {}).filter(([key]) => !bad.has(key));
    return entries.length ? (Object.fromEntries(entries) as Partial<Values>) : undefined;
  };
  const weekly = keep(custom.weekly, weeklyInvalid);
  const annual = keep(custom.annual, annualInvalid);
  return { ...(weekly && { weekly }), ...(annual && { annual }) };
}

function loadOverrides(saved: unknown, parameters: CalendarParameters): Record<string, SpecialistParameters> {
  const entries = savedRecord.safeParse(saved);
  if (!entries.success) return {};
  return Object.fromEntries(
    Object.entries(entries.data).flatMap(([id, value]) => {
      const parsed = specialistParametersSchema.safeParse(value);
      if (!parsed.success) return [];
      const role = roleOf(id);
      const custom = withoutInvalidFields(role ?? "therapist", normalizeOverride(role, parsed.data), parameters);
      return custom.weekly || custom.annual ? [[id, custom]] : [];
    }),
  );
}


export function specialistOverridesFrom(form: SpecialistParametersForm): SpecialistParameters {
  const pick = <Values extends object>(values: Values, flags: Record<string, boolean>) =>
    Object.fromEntries(Object.entries(values).filter(([key]) => flags[key])) as Partial<Values>;
  return { weekly: pick(form.values.weekly, form.custom.weekly), annual: pick(form.values.annual, form.custom.annual) };
}

export function overridesInConflict(
  parameters: CalendarParameters,
  overrides: Record<string, SpecialistParameters>,
): string[] {
  return Object.entries(overrides).flatMap(([id, custom]) => {
    const role = roleOf(id);
    if (!role) return [];
    return roleParametersSchema.safeParse(resolveSpecialistParameters(parameters, role, custom)).success ? [] : [id];
  });
}

interface ParametersStore {
  parameters: CalendarParameters;
  specialistOverrides: Record<string, SpecialistParameters>;
  adminSwitches: Record<string, AdminRuleSwitches>;
  apply: (next: CalendarParameters) => void;
  customize: (id: string, role: SpecialistType, next: SpecialistParameters) => void;
  setRuleEnabled: (id: string, path: ParameterPath, enabled: boolean) => void;
  setRulesEnabled: (id: string, paths: ParameterPath[], enabled: boolean) => void;
  clearRuleSwitches: () => void;
}

export const useCalendarParameters = create<ParametersStore>()(persist((set, get) => ({
  parameters: defaultCalendarParameters(),
  specialistOverrides: {},
  adminSwitches: {},
  apply: (next) => {
    const parameters = withRolesRules(calendarParametersSchema.parse(next));
    set({ parameters });
  },
  customize: (id, role, next) => {
    const custom = normalizeOverride(role, specialistParametersSchema.parse(next));
    roleParametersSchema.parse(resolveSpecialistParameters(get().parameters, role, custom));
    set((state) => ({ specialistOverrides: { ...state.specialistOverrides, [id]: custom } }));
  },
  setRuleEnabled: (id, path, enabled) => get().setRulesEnabled(id, [path], enabled),
  setRulesEnabled: (id, paths, enabled) => {
    if (paths.some((path) => !switchKeys.includes(path))) throw new Error("Unknown calendar rule");
    const flags = { ...get().adminSwitches[id] };
    paths.forEach((path) => {
      if (enabled) delete flags[path];
      else flags[path] = false;
    });
    set((state) => ({ adminSwitches: { ...state.adminSwitches, [id]: flags } }));
  },
  clearRuleSwitches: () => set({ adminSwitches: {} }),
}), {
  name: CALENDAR_PARAMETERS_STORAGE_KEY,
  version: 2,
  migrate: (saved) => saved,
  partialize: (state) => ({ parameters: state.parameters, specialistOverrides: state.specialistOverrides }),
  merge: (saved, current) => {
    const state = z
      .object({ parameters: z.unknown(), specialistOverrides: z.unknown() })
      .partial()
      .safeParse(saved);
    if (!state.success) return current;
    const parameters = loadParameters(state.data.parameters, current.parameters);
    return { ...current, parameters, specialistOverrides: loadOverrides(state.data.specialistOverrides, parameters) };
  },
}));
