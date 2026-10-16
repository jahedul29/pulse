import { isDarkMapBackground, isMapBackground } from "./backgrounds";

describe("map backgrounds", () => {
  it("accepts only known backgrounds", () => {
    expect(isMapBackground("streets")).toBe(true);
    expect(isMapBackground("satellite")).toBe(false);
    expect(isMapBackground(undefined)).toBe(false);
  });

  it("treats the blank background as dark only in the dark theme", () => {
    expect(isDarkMapBackground("dark", false)).toBe(true);
    expect(isDarkMapBackground("none", true)).toBe(true);
    expect(isDarkMapBackground("none", false)).toBe(false);
    expect(isDarkMapBackground("grey", true)).toBe(false);
  });
});
