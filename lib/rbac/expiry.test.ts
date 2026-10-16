import { dateKey, endOfDayIso, isFutureDateKey, parseDateKey, todayKey } from "./expiry";

describe("role grant expiry dates", () => {
  const now = new Date(2026, 9, 15, 10, 30);

  it("formats and parses local calendar dates", () => {
    expect(dateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(todayKey(now)).toBe("2026-10-15");
    expect(parseDateKey("2026-12-31")?.getDate()).toBe(31);
    expect(parseDateKey("31-12-2026")).toBeUndefined();
  });

  it("sends the end of the chosen local day as an ISO datetime", () => {
    const iso = endOfDayIso("2026-12-31");
    expect(iso).not.toBeNull();
    const sent = new Date(iso as string);
    expect(dateKey(sent)).toBe("2026-12-31");
    expect([sent.getHours(), sent.getMinutes(), sent.getSeconds()]).toEqual([23, 59, 59]);
    expect(endOfDayIso("")).toBeNull();
  });

  it("only treats days after today as a valid expiry", () => {
    expect(isFutureDateKey("2026-10-16", now)).toBe(true);
    expect(isFutureDateKey("2026-10-15", now)).toBe(false);
    expect(isFutureDateKey("2026-10-01", now)).toBe(false);
    expect(isFutureDateKey("nonsense", now)).toBe(false);
  });
});
