import { countryRegionsHref, parseRouteId, regionHref } from "./routes";

describe("location routes", () => {
  it("builds links to the region builder and a country's regions", () => {
    expect(regionHref(4)).toBe("/admin/locations/builder?region=4");
    expect(countryRegionsHref(1)).toBe("/admin/locations/regions?country=1");
  });

  it("accepts only positive whole-number ids", () => {
    expect(parseRouteId("5")).toBe(5);
    expect(parseRouteId("0")).toBeNull();
    expect(parseRouteId("5x")).toBeNull();
    expect(parseRouteId("abc")).toBeNull();
    expect(parseRouteId(null)).toBeNull();
  });
});
