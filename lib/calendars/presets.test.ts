import { ANNUAL_RULES, WEEKLY_RULES } from "./presets";

describe("role rule sets", () => {
  it("pins the therapist weekly rules from the rulebook", () => {
    expect(WEEKLY_RULES.therapist).toMatchObject({
      minBlockInPersonMins: 60,
      continuousWindowMins: 360,
      maxDaysOff: 2,
      minAdjacentUnavailMins: 15,
      supportsOnline: false,
      mirrorWorkdays: true,
      travelTime: { required: true, options: [45, 60, 75, 90, 105] },
    });
  });

  it("pins the analyst weekly rules from the rulebook", () => {
    expect(WEEKLY_RULES.analyst).toMatchObject({
      minBlockInPersonMins: 60,
      minBlockOnlineMins: 30,
      minBreakMins: 15,
      continuousWindowMins: 180,
      maxDaysOff: 2,
      minAdjacentUnavailMins: 15,
      supportsOnline: true,
      mirrorWorkdays: true,
      travelTime: null,
    });
  });

  it("pins the annual rules", () => {
    expect(ANNUAL_RULES.therapist).toEqual({ maxDaysOffPerYear: 56, maxConsecutiveDays: 56, minGapWeeks: 0 });
    expect(ANNUAL_RULES.analyst).toEqual({ maxDaysOffPerYear: 56, maxConsecutiveDays: 28, minGapWeeks: 4 });
  });
});
