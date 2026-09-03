import { configFor, cycleStatus, validateDay, addBlock, setAvailable } from "./rules";
import { THERAPIST_DEFAULTS, ANALYST_DEFAULTS, SLOTS_PER_DAY } from "./constants";
import type { DayState, RuleConfig, RuleResult } from "./types";

const empty: DayState = { blocks: [] };
const byId = (results: RuleResult[], id: string) => results.find((result) => result.id === id);

describe("configFor", () => {
  it("returns therapist defaults", () => {
    expect(configFor("therapist")).toEqual(THERAPIST_DEFAULTS);
  });
  it("returns analyst defaults", () => {
    expect(configFor("analyst")).toEqual(ANALYST_DEFAULTS);
  });
});

describe("cycleStatus", () => {
  it("skips online-only for a therapist", () => {
    expect(cycleStatus("available", false)).toBe("unavailable");
    expect(cycleStatus("unavailable", false)).toBe("available");
    expect(cycleStatus("online", false)).toBe("available");
  });
  it("cycles through online-only for an analyst", () => {
    expect(cycleStatus("available", true)).toBe("unavailable");
    expect(cycleStatus("unavailable", true)).toBe("online");
    expect(cycleStatus("online", true)).toBe("available");
  });
});

describe("validateDay", () => {
  const therapist = configFor("therapist");
  const analyst = configFor("analyst");

  it("passes every rule for an all-available workday", () => {
    const results = validateDay(empty, therapist, { isWorkday: true });
    expect(results.every((result) => result.pass)).toBe(true);
  });

  it("fails min-block when the in-person run is shorter than the minimum", () => {
    const day: DayState = { blocks: [{ start: 2, end: SLOTS_PER_DAY, kind: "unavailable" }] };
    const result = byId(validateDay(day, therapist, { isWorkday: true }), "min-block");
    expect(result?.pass).toBe(false);
    expect(result?.offending).toEqual([0, 1]);
  });

  it("fails an interior break below the minimum but allows a short edge", () => {
    const cfg: RuleConfig = { ...analyst, minBreakMins: 30 };
    const interior: DayState = { blocks: [{ start: 4, end: 5, kind: "unavailable" }] };
    expect(byId(validateDay(interior, cfg, { isWorkday: true }), "breaks")?.pass).toBe(false);
    const edge: DayState = { blocks: [{ start: 0, end: 1, kind: "unavailable" }] };
    expect(byId(validateDay(edge, cfg, { isWorkday: true }), "breaks")?.pass).toBe(true);
  });

  it("enforces the online-only minimum for an analyst", () => {
    const short: DayState = { blocks: [{ start: 0, end: 1, kind: "online" }] };
    expect(byId(validateDay(short, analyst, { isWorkday: true }), "online-block")?.pass).toBe(false);
    const ok: DayState = { blocks: [{ start: 0, end: 2, kind: "online" }] };
    expect(byId(validateDay(ok, analyst, { isWorkday: true }), "online-block")?.pass).toBe(true);
  });

  it("applies the continuous-window rule only on workdays", () => {
    expect(byId(validateDay(empty, therapist, { isWorkday: true }), "window")).toBeDefined();
    expect(byId(validateDay(empty, therapist, { isWorkday: false }), "window")).toBeUndefined();
  });
});

describe("addBlock and setAvailable", () => {
  it("addBlock inserts a block", () => {
    const next = addBlock(empty, { start: 2, end: 5, kind: "unavailable" });
    expect(next.blocks).toEqual([{ start: 2, end: 5, kind: "unavailable" }]);
  });

  it("setAvailable clears a span, splitting the surrounding block", () => {
    const day: DayState = { blocks: [{ start: 0, end: 10, kind: "unavailable" }] };
    const next = setAvailable(day, 3, 6);
    expect(next.blocks).toEqual([
      { start: 0, end: 3, kind: "unavailable" },
      { start: 6, end: 10, kind: "unavailable" },
    ]);
  });
});
