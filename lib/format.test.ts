import {
  fmtDate,
  fmtMoney,
  fmtNumber,
  fmtCompact,
  fmtDelta,
  fmtDateTimeParts,
  startOfTomorrow,
} from "./format";

describe("format helpers", () => {
  it("fmtDate renders dd-Mmm-YYYY", () => {
    expect(fmtDate("2026-08-17")).toBe("17-Aug-2026");
    expect(fmtDate("2026-01-05")).toBe("05-Jan-2026");
  });

  it("fmtMoney is grouped with two decimals", () => {
    expect(fmtMoney(1234.5)).toBe("1,234.50");
    expect(fmtMoney(0)).toBe("0.00");
  });

  it("fmtNumber groups thousands", () => {
    expect(fmtNumber(1234567)).toBe("1,234,567");
  });

  it("fmtCompact abbreviates", () => {
    expect(fmtCompact(1500)).toBe("1.5K");
    expect(fmtCompact(2_000_000)).toBe("2M");
  });

  it("fmtDelta shows a sign only when positive", () => {
    expect(fmtDelta(5)).toBe("+5%");
    expect(fmtDelta(-3)).toBe("-3%");
    expect(fmtDelta(0)).toBe("0%");
  });

  it("fmtDateTimeParts renders the browser-local date and time", () => {
    const ms = new Date(2026, 7, 17, 9, 5).getTime();
    expect(fmtDateTimeParts(ms)).toEqual({ time: "09:05", date: "17-Aug-2026" });
  });

  it("fmtDateTimeParts keeps latin digits under the Arabic locale", () => {
    const ms = new Date(2026, 7, 17, 9, 5).getTime();
    expect(fmtDateTimeParts(ms, "ar").time).toBe("09:05");
  });
});

describe("startOfTomorrow", () => {
  it("returns local midnight tomorrow, in the future", () => {
    const d = startOfTomorrow();
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
    expect(d.getTime()).toBeGreaterThan(Date.now());
  });
});
