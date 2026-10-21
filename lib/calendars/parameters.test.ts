import { CALENDAR_PARAMETERS_STORAGE_KEY, DEFAULT_TRAVEL_OPTIONS, overridesInConflict, TRAVEL_CHOICES, adminCalendarParameters, withRoleRules, resolveSpecialistParameters, calendarParametersSchema, defaultCalendarParameters, sameParameters, specialistFormValues, specialistOverridesFrom, useCalendarParameters } from "./parameters";

beforeEach(() => {
  localStorage.clear();
  useCalendarParameters.setState({ parameters: defaultCalendarParameters(), specialistOverrides: {}, adminSwitches: {} });
});

describe("calendar settings", () => {
  it("accepts both role defaults and allows disabling annual limits", () => {
    const parameters = defaultCalendarParameters();
    parameters.analyst.annual = { maxDaysOffPerYear: 0, maxConsecutiveDays: 0, minGapWeeks: 0 };
    expect(calendarParametersSchema.safeParse(parameters).success).toBe(true);
  });

  it.each(["fractional minutes", "duplicate travel options", "empty travel options", "short window", "excess days"])("rejects %s without replacing applied settings", (scenario) => {
    const parameters = defaultCalendarParameters();
    if (scenario === "fractional minutes") parameters.therapist.weekly.minBreakMins = 20;
    if (scenario === "duplicate travel options") parameters.therapist.weekly.travelTime = { required: true, options: [45, 45] };
    if (scenario === "empty travel options") parameters.therapist.weekly.travelTime = { required: true, options: [] };
    if (scenario === "short window") parameters.analyst.weekly.continuousWindowMins = 15;
    if (scenario === "excess days") parameters.analyst.annual.maxDaysOffPerYear = 367;
    expect(() => useCalendarParameters.getState().apply(parameters)).toThrow();
    expect(useCalendarParameters.getState().parameters).toEqual(defaultCalendarParameters());
  });

  it("persists applied role settings and reloads them without changing the other role", async () => {
    const parameters = defaultCalendarParameters();
    parameters.analyst.annual.maxConsecutiveDays = 7;
    useCalendarParameters.getState().apply(parameters);
    expect(JSON.parse(localStorage.getItem("abapro-calendar-settings")!).state.parameters.analyst.annual.maxConsecutiveDays).toBe(7);
    const stored = localStorage.getItem("abapro-calendar-settings")!;
    useCalendarParameters.setState({ parameters: defaultCalendarParameters() });
    localStorage.setItem("abapro-calendar-settings", stored);
    await useCalendarParameters.persist.rehydrate();
    expect(useCalendarParameters.getState().parameters.analyst.annual.maxConsecutiveDays).toBe(7);
    expect(useCalendarParameters.getState().parameters.therapist).toEqual(defaultCalendarParameters().therapist);
  });
});

describe("three parameter levels", () => {
  it("propagates global changes per field and preserves customized values, including zero", () => {
    const store = useCalendarParameters.getState();
    store.customize("sp-1", "therapist", { annual: { maxDaysOffPerYear: 70, minGapWeeks: 0 } });
    const global = defaultCalendarParameters();
    global.therapist.annual = { maxDaysOffPerYear: 90, maxConsecutiveDays: 40, minGapWeeks: 3 };
    store.apply(global);
    const current = useCalendarParameters.getState();
    const resolved = resolveSpecialistParameters(current.parameters, "therapist", current.specialistOverrides["sp-1"]);
    expect(resolved.annual).toEqual({ maxDaysOffPerYear: 70, maxConsecutiveDays: 40, minGapWeeks: 0 });
    expect(resolveSpecialistParameters(current.parameters, "therapist").annual.maxDaysOffPerYear).toBe(90);
    store.customize("sp-1", "therapist", { annual: { minGapWeeks: 0 } });
    expect(resolveSpecialistParameters(global, "therapist", useCalendarParameters.getState().specialistOverrides["sp-1"]).annual.maxDaysOffPerYear).toBe(90);
  });

  it("bypasses annual rules for the admin edit without replacing specialist values", () => {
    const values = defaultCalendarParameters().analyst;
    const switched = adminCalendarParameters(values, { "annual.maxDaysOffPerYear": false, "annual.maxConsecutiveDays": false, "annual.minGapWeeks": false });
    expect(switched.annual).toEqual({ maxDaysOffPerYear: 0, maxConsecutiveDays: 0, minGapWeeks: 0 });
    expect(values.annual).toEqual({ maxDaysOffPerYear: 56, maxConsecutiveDays: 28, minGapWeeks: 4 });
    expect(adminCalendarParameters(values).annual).toEqual(values.annual);
  });

  it("isolates editor switches by specialist and preserves values across global updates", () => {
    const store = useCalendarParameters.getState();
    store.setRuleEnabled("sp-1", "annual.minGapWeeks", false);
    store.apply(defaultCalendarParameters());
    expect(useCalendarParameters.getState().adminSwitches["sp-1"]["annual.minGapWeeks"]).toBe(false);
    expect(useCalendarParameters.getState().adminSwitches["sp-4"]).toBeUndefined();
    store.setRuleEnabled("sp-1", "annual.minGapWeeks", true);
    expect(useCalendarParameters.getState().adminSwitches["sp-1"]).toEqual({});
  });

  it("uses Therapist consecutive default 56 and accepts any gap from 0 to 52 weeks", () => {
    const values = defaultCalendarParameters();
    expect(values.therapist.annual).toEqual({ maxDaysOffPerYear: 56, maxConsecutiveDays: 56, minGapWeeks: 0 });
    values.therapist.annual.minGapWeeks = 52;
    expect(calendarParametersSchema.safeParse(values).success).toBe(true);
    values.therapist.annual.minGapWeeks = 53;
    expect(calendarParametersSchema.safeParse(values).success).toBe(false);
  });

  it("limits travel time choices to 15 to 240 minutes", () => {
    const values = defaultCalendarParameters();
    values.therapist.weekly.travelTime = { required: true, options: [45, 240] };
    expect(calendarParametersSchema.safeParse(values).success).toBe(true);
    values.therapist.weekly.travelTime = { required: true, options: [45, 300] };
    expect(calendarParametersSchema.safeParse(values).success).toBe(false);
    expect(TRAVEL_CHOICES.at(-1)).toBe(240);
  });

  it("rejects invalid specialist overrides without losing the prior values", () => {
    const store = useCalendarParameters.getState();
    store.customize("sp-1", "therapist", { annual: { maxConsecutiveDays: 10 } });
    expect(() => store.customize("sp-1", "therapist", { weekly: { minBlockInPersonMins: 20 } })).toThrow();
    expect(useCalendarParameters.getState().specialistOverrides["sp-1"]).toEqual({ annual: { maxConsecutiveDays: 10 } });
  });

  it("migrates existing global mock values without silently changing them", async () => {
    const parameters = defaultCalendarParameters();
    parameters.therapist.annual.maxConsecutiveDays = 0;
    localStorage.setItem("abapro-calendar-settings", JSON.stringify({ version: 1, state: { parameters } }));
    await useCalendarParameters.persist.rehydrate();
    expect(useCalendarParameters.getState().parameters.therapist.annual.maxConsecutiveDays).toBe(0);
    expect(useCalendarParameters.getState().specialistOverrides).toEqual({});
  });
});

describe("specialist form mapping", () => {
  it("flags only customized fields and round-trips them back to overrides", () => {
    const global = defaultCalendarParameters();
    const custom = { weekly: { maxDaysOff: 3, travelTime: { required: true, options: [45, 60] } }, annual: { minGapWeeks: 0 } };
    const form = specialistFormValues("therapist", resolveSpecialistParameters(global, "therapist", custom), custom);
    expect(form.values.weekly.maxDaysOff).toBe(3);
    expect(form.values.annual.maxDaysOffPerYear).toBe(56);
    expect(form.custom.weekly).toEqual(expect.objectContaining({ maxDaysOff: true, travelTime: true, minBreakMins: false }));
    expect(Object.hasOwn(form.custom.weekly, "supportsOnline")).toBe(false);
    expect(form.custom.annual).toEqual({ maxDaysOffPerYear: false, maxConsecutiveDays: false, minGapWeeks: true });
    expect(specialistOverridesFrom(form)).toEqual(custom);
  });

  it("drops values whose override was switched off", () => {
    const form = specialistFormValues("analyst", defaultCalendarParameters().analyst, { annual: { maxConsecutiveDays: 10 } });
    form.custom.annual.maxConsecutiveDays = false;
    expect(specialistOverridesFrom(form)).toEqual({ weekly: {}, annual: {} });
  });

  it("compares parameter sets by value", () => {
    expect(sameParameters(defaultCalendarParameters(), defaultCalendarParameters())).toBe(true);
    const changed = defaultCalendarParameters();
    changed.analyst.annual.minGapWeeks = 5;
    expect(sameParameters(changed, defaultCalendarParameters())).toBe(false);
  });

  it("offers travel choices in 15-minute steps that include the defaults", () => {
    expect(TRAVEL_CHOICES[0]).toBe(15);
    expect(TRAVEL_CHOICES.every((minutes) => minutes % 15 === 0)).toBe(true);
    expect(DEFAULT_TRAVEL_OPTIONS.every((minutes) => TRAVEL_CHOICES.includes(minutes))).toBe(true);
  });
});

describe("fixed travel time rule", () => {
  it("always requires travel time for therapists and never gives analysts one", () => {
    const values = defaultCalendarParameters();
    values.therapist.weekly.travelTime = null;
    values.analyst.weekly.travelTime = { required: false, options: [30] };
    useCalendarParameters.getState().apply(values);
    const { parameters } = useCalendarParameters.getState();
    expect(parameters.therapist.weekly.travelTime).toEqual({ required: true, options: DEFAULT_TRAVEL_OPTIONS });
    expect(parameters.analyst.weekly.travelTime).toBeNull();
    expect(withRoleRules("therapist", { ...values.therapist, weekly: { ...values.therapist.weekly, travelTime: { required: false, options: [30, 45] } } }).weekly.travelTime).toEqual({ required: true, options: [30, 45] });
  });

  it("keeps specialist travel overrides required and drops them for analysts", () => {
    const store = useCalendarParameters.getState();
    store.customize("sp-1", "therapist", { weekly: { travelTime: { required: false, options: [30] } } });
    store.customize("sp-4", "analyst", { weekly: { travelTime: { required: true, options: [30] }, maxDaysOff: 1 } });
    const { specialistOverrides, parameters } = useCalendarParameters.getState();
    expect(specialistOverrides["sp-1"].weekly?.travelTime).toEqual({ required: true, options: [30] });
    expect(specialistOverrides["sp-4"].weekly).toEqual({ maxDaysOff: 1 });
    expect(resolveSpecialistParameters(parameters, "analyst", { weekly: { travelTime: { required: true, options: [30] } } }).weekly.travelTime).toBeNull();
  });

  it("fixes online availability and shared workdays per role", () => {
    const values = defaultCalendarParameters();
    values.therapist.weekly.supportsOnline = true;
    values.analyst.weekly.supportsOnline = false;
    values.analyst.weekly.mirrorWorkdays = false;
    useCalendarParameters.getState().apply(values);
    const { parameters } = useCalendarParameters.getState();
    expect(parameters.therapist.weekly.supportsOnline).toBe(false);
    expect(parameters.analyst.weekly.supportsOnline).toBe(true);
    expect(parameters.analyst.weekly.mirrorWorkdays).toBe(true);
    useCalendarParameters.getState().customize("sp-1", "therapist", { weekly: { supportsOnline: true, mirrorWorkdays: false, maxDaysOff: 3 } });
    expect(useCalendarParameters.getState().specialistOverrides["sp-1"].weekly).toEqual({ maxDaysOff: 3 });
  });

  it("repairs settings saved with the old travel switches without losing other values", async () => {
    const saved = defaultCalendarParameters();
    saved.therapist.weekly.travelTime = null;
    saved.therapist.annual.minGapWeeks = 3;
    localStorage.setItem(
      CALENDAR_PARAMETERS_STORAGE_KEY,
      JSON.stringify({ version: 2, state: { parameters: saved, specialistOverrides: {}, adminSwitches: { "sp-1": { "weekly.travelTime": false, "weekly.supportsOnline": false, "annual.minGapWeeks": false } } } }),
    );
    await useCalendarParameters.persist.rehydrate();
    const state = useCalendarParameters.getState();
    expect(state.parameters.therapist.weekly.travelTime).toEqual({ required: true, options: DEFAULT_TRAVEL_OPTIONS });
    expect(state.parameters.therapist.annual.minGapWeeks).toBe(3);
    expect(state.adminSwitches).toEqual({});
  });
});

describe("loading saved settings", () => {
  it("keeps every valid section and specialist when one entry is broken", async () => {
    const saved = defaultCalendarParameters();
    saved.therapist.annual.minGapWeeks = 3;
    const brokenAnalyst = { ...saved.analyst, weekly: { ...saved.analyst.weekly, minBreakMins: 20 } };
    localStorage.setItem(
      CALENDAR_PARAMETERS_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        state: {
          parameters: { therapist: saved.therapist, analyst: brokenAnalyst },
          specialistOverrides: {
            "sp-1": { annual: { maxDaysOffPerYear: 40, minGapWeeks: 99 } },
            "sp-9": { weekly: { minBreakMins: 7 } },
          },
          adminSwitches: { "sp-1": { "annual.minGapWeeks": false } },
        },
      }),
    );
    await useCalendarParameters.persist.rehydrate();
    const state = useCalendarParameters.getState();
    expect(state.parameters.therapist.annual.minGapWeeks).toBe(3);
    expect(state.parameters.analyst).toEqual(defaultCalendarParameters().analyst);
    expect(state.specialistOverrides).toEqual({ "sp-1": { annual: { maxDaysOffPerYear: 40 } } });
    expect(state.adminSwitches).toEqual({});
  });

  it("cleans saved overrides for the specialist's role", async () => {
    localStorage.setItem(
      CALENDAR_PARAMETERS_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        state: {
          parameters: defaultCalendarParameters(),
          specialistOverrides: {
            "sp-4": { weekly: { travelTime: { required: true, options: [30] }, supportsOnline: false, maxDaysOff: 1 } },
            "sp-1": { weekly: { travelTime: { required: false, options: [30] }, mirrorWorkdays: false } },
          },
        },
      }),
    );
    await useCalendarParameters.persist.rehydrate();
    const { specialistOverrides } = useCalendarParameters.getState();
    expect(specialistOverrides["sp-4"].weekly).toEqual({ maxDaysOff: 1 });
    expect(specialistOverrides["sp-1"].weekly).toEqual({ travelTime: { required: true, options: [30] } });
    expect(Object.hasOwn(specialistFormValues("analyst", defaultCalendarParameters().analyst, specialistOverrides["sp-4"]).custom.weekly, "travelTime")).toBe(false);
  });
});

describe("rule switches and conflicts", () => {
  it("keeps rule switches in memory only and clears them on request", () => {
    const store = useCalendarParameters.getState();
    store.setRuleEnabled("sp-1", "annual.minGapWeeks", false);
    expect(JSON.parse(localStorage.getItem(CALENDAR_PARAMETERS_STORAGE_KEY) ?? "{}").state.adminSwitches).toBeUndefined();
    store.clearRuleSwitches();
    expect(useCalendarParameters.getState().adminSwitches).toEqual({});
  });

  it("finds specialists whose saved values stop fitting new defaults", () => {
    const next = defaultCalendarParameters();
    next.therapist.weekly.minBlockInPersonMins = 180;
    const overrides = { "sp-1": { weekly: { continuousWindowMins: 120 } }, "sp-4": { annual: { maxDaysOffPerYear: 30 } } };
    expect(overridesInConflict(next, overrides)).toEqual(["sp-1"]);
    expect(overridesInConflict(defaultCalendarParameters(), overrides)).toEqual([]);
  });

  it("compares parameter sets by value whatever the key order", () => {
    expect(sameParameters({ a: 1, b: [1, 2] }, { b: [1, 2], a: 1 })).toBe(true);
    expect(sameParameters({ a: 1 }, { a: 1, b: undefined })).toBe(false);
    expect(sameParameters([1, 2], { 0: 1, 1: 2 })).toBe(false);
  });
});

