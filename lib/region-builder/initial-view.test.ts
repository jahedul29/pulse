import {
  CELL_ZOOM,
  countryMiddle,
  initialRegionView,
  isSavedMapView,
  REGION_CENTRE_ZOOM,
  WORLD_VIEW,
} from "./initial-view";

const cities = [
  { country_id: 1, center: { lat: 24.4, lng: 54.4 } },
  { country_id: 1, center: { lat: 25.2, lng: 55.3 } },
  { country_id: 1, center: null },
  { country_id: 2, center: { lat: 39.9, lng: 116.4 } },
];

describe("countryMiddle", () => {
  it("returns the middle of the country's region centres", () => {
    const middle = countryMiddle(cities, 1);
    expect(middle?.[0]).toBeCloseTo(54.85);
    expect(middle?.[1]).toBeCloseTo(24.8);
  });

  it("returns null when no region of the country has a centre", () => {
    expect(countryMiddle(cities, 3)).toBeNull();
  });
});

describe("initialRegionView", () => {
  const lastView = { center: [54.9, 24.1] as [number, number], zoom: 11, countryId: 1, owner: "u-1" };
  const base = { centre: null, countryId: 1, owner: "u-1", lastView, middle: [54, 24] as [number, number] };

  it("opens a region with a centre on that centre", () => {
    expect(initialRegionView({ ...base, centre: [55, 25] })).toEqual({ center: [55, 25], zoom: REGION_CENTRE_ZOOM });
  });

  it("keeps the same admin's last view for an empty region of the same country", () => {
    expect(initialRegionView(base)).toEqual({ center: [54.9, 24.1], zoom: 11 });
  });

  it("zooms the last view in far enough to show the grid", () => {
    expect(initialRegionView({ ...base, lastView: { ...lastView, zoom: 6 } }).zoom).toBe(CELL_ZOOM);
  });

  it("ignores another admin's last view", () => {
    expect(initialRegionView({ ...base, owner: "u-2" })).toEqual({ center: [54, 24], zoom: CELL_ZOOM });
  });

  it("uses the country's middle at grid zoom when the last view was in another country", () => {
    expect(initialRegionView({ ...base, countryId: 2, middle: [116.4, 39.9] })).toEqual({
      center: [116.4, 39.9],
      zoom: CELL_ZOOM,
    });
  });

  it("falls back to a world view when nothing about the country is known", () => {
    expect(initialRegionView({ ...base, countryId: 2, middle: null })).toEqual(WORLD_VIEW);
  });
});

describe("isSavedMapView", () => {
  const view = { center: [54, 24], zoom: 9, countryId: 1, owner: "u-1" };

  it("accepts a well-formed view", () => {
    expect(isSavedMapView(view)).toBe(true);
  });

  it("rejects views with missing fields or values a map can't use", () => {
    expect(isSavedMapView({ ...view, center: [54, "24"] })).toBe(false);
    expect(isSavedMapView({ ...view, center: [54, 95] })).toBe(false);
    expect(isSavedMapView({ ...view, center: [200, 24] })).toBe(false);
    expect(isSavedMapView({ ...view, zoom: Number.NaN })).toBe(false);
    expect(isSavedMapView({ ...view, zoom: 40 })).toBe(false);
    expect(isSavedMapView({ ...view, owner: "" })).toBe(false);
    expect(isSavedMapView({ center: [54, 24], zoom: 9, countryId: 1 })).toBe(false);
    expect(isSavedMapView(null)).toBe(false);
  });
});
