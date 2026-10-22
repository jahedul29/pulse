import { PERIOD_PRESETS, isPeriodRange, periodRange, sameRange } from "./periods";

const now = new Date(2026, 9, 22, 14, 30, 15);
const end = now.getTime();

describe("periodRange", () => {
  it("ends every preset at the moment it is chosen", () => {
    for (const preset of PERIOD_PRESETS) expect(periodRange(preset, now)[1]).toBe(end);
  });

  it("counts rolling windows back from now", () => {
    expect(periodRange("last1h", now)[0]).toBe(end - 3_600_000);
    expect(periodRange("last24h", now)[0]).toBe(end - 86_400_000);
    expect(periodRange("last7d", now)[0]).toBe(end - 7 * 86_400_000);
    expect(periodRange("last30d", now)[0]).toBe(end - 30 * 86_400_000);
  });

  it("starts today and this month at local midnight", () => {
    expect(periodRange("today", now)[0]).toBe(new Date(2026, 9, 22).getTime());
    expect(periodRange("thisMonth", now)[0]).toBe(new Date(2026, 9, 1).getTime());
  });
});

describe("range helpers", () => {
  it("recognises a date range filter value and compares two of them", () => {
    expect(isPeriodRange([1, 2])).toBe(true);
    expect(isPeriodRange([undefined, 2])).toBe(true);
    expect(isPeriodRange(["a"])).toBe(false);
    expect(sameRange([1, 2], [1, 2])).toBe(true);
    expect(sameRange([1, 2], [1, 3])).toBe(false);
    expect(sameRange(undefined, [1, 2])).toBe(false);
  });
});
