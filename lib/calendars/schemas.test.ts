import { WEEKLY_RULES, ANNUAL_RULES } from "./presets";
import { calendarParametersSchemaFor, roleParametersSchemaFor, specialistParametersFormSchemaFor, type ParameterMessages } from "./schemas";

const messages: ParameterMessages = {
  mustBeNumber: "number",
  wholeNumber: "whole",
  minutesRange: "minutes",
  daysPerWeek: "week",
  daysPerYear: "year",
  weeksRange: "weeks",
  travelRange: "travel range",
  windowTooShort: "window",
  travelEmpty: "travel empty",
  travelDuplicate: "travel duplicate",
};

function role() {
  return { weekly: { ...WEEKLY_RULES.therapist }, annual: { ...ANNUAL_RULES.therapist } };
}

function issues(value: unknown) {
  const result = roleParametersSchemaFor(messages).safeParse(value);
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join(".")}:${issue.message}`);
}

describe("roleParametersSchemaFor", () => {
  it("accepts the role presets", () => {
    expect(issues(role())).toEqual([]);
  });

  it("returns the translated message for each broken rule", () => {
    const value = role();
    value.weekly.minBreakMins = 20;
    value.weekly.maxDaysOff = 8;
    value.annual.maxDaysOffPerYear = 400;
    value.annual.minGapWeeks = -1;
    expect(issues(value)).toEqual(
      expect.arrayContaining([
        "weekly.minBreakMins:minutes",
        "weekly.maxDaysOff:week",
        "annual.maxDaysOffPerYear:year",
        "annual.minGapWeeks:weeks",
      ]),
    );
  });

  it("asks for a number when a field is empty", () => {
    const value = role();
    value.annual.maxConsecutiveDays = Number.NaN;
    expect(issues(value)).toEqual(["annual.maxConsecutiveDays:number"]);
  });

  it("checks the continuous window and travel choices", () => {
    const value = role();
    value.weekly.continuousWindowMins = 45;
    expect(issues(value)).toContain("weekly.continuousWindowMins:window");
    const empty = role();
    empty.weekly.travelTime = { required: true, options: [] };
    expect(issues(empty)).toContain("weekly.travelTime.options:travel empty");
    const duplicate = role();
    duplicate.weekly.travelTime = { required: true, options: [45, 45] };
    expect(issues(duplicate)).toContain("weekly.travelTime.options:travel duplicate");
  });

  it("accepts a Therapist gap from 0 up to 52 weeks", () => {
    const value = role();
    value.annual.minGapWeeks = 0;
    expect(issues(value)).toEqual([]);
    value.annual.minGapWeeks = 52;
    expect(issues(value)).toEqual([]);
    value.annual.minGapWeeks = 53;
    expect(issues(value)).toContain("annual.minGapWeeks:weeks");
  });
});

describe("form schemas", () => {
  it("validates both roles and the specialist override flags", () => {
    expect(calendarParametersSchemaFor(messages).safeParse({ therapist: role(), analyst: role() }).success).toBe(true);
    const form = { values: role(), custom: { weekly: { maxDaysOff: true }, annual: {} } };
    expect(specialistParametersFormSchemaFor(messages).safeParse(form).success).toBe(true);
    expect(specialistParametersFormSchemaFor(messages).safeParse({ values: role(), custom: { weekly: { maxDaysOff: "yes" }, annual: {} } }).success).toBe(false);
  });
});
