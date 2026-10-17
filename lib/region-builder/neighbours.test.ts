import { distanceKm } from "./geometry";
import { nearestNeighbours, type NeighbourCandidate } from "./neighbours";

function city(id: number, overrides: Partial<NeighbourCandidate> = {}): NeighbourCandidate {
  return { id, country_id: 1, sort_order: id, center: { lat: 25, lng: 55 }, tiles_url: `u${id}`, ...overrides };
}

describe("distanceKm", () => {
  it("measures short distances in kilometres", () => {
    expect(distanceKm({ lat: 25, lng: 55 }, { lat: 25, lng: 55 })).toBe(0);
    expect(distanceKm({ lat: 25, lng: 55 }, { lat: 26, lng: 55 })).toBeCloseTo(110.574, 2);
  });
});

describe("nearestNeighbours", () => {
  it("keeps the three closest mapped regions of the same country within 300 km", () => {
    const region = city(1);
    const candidates = [
      region,
      city(2, { center: { lat: 25.5, lng: 55 } }),
      city(3, { center: { lat: 25.1, lng: 55 } }),
      city(4, { center: { lat: 25.2, lng: 55 } }),
      city(5, { center: { lat: 25.3, lng: 55 } }),
      city(6, { center: { lat: 29, lng: 55 } }),
      city(7, { country_id: 2 }),
      city(8, { tiles_url: null }),
      city(9, { center: null }),
    ];
    expect(nearestNeighbours(region, candidates).map((entry) => entry.id)).toEqual([3, 4, 5]);
  });

  it("measures from a fallback point when the region has no centre yet", () => {
    const region = city(1, { center: null });
    const candidates = [
      region,
      city(2, { center: { lat: 24, lng: 54 } }),
      city(3, { center: { lat: 25.1, lng: 55 } }),
    ];
    expect(nearestNeighbours(region, candidates).map((entry) => entry.id)).toEqual([]);
    expect(nearestNeighbours(region, candidates, { lat: 24, lng: 54 }).map((entry) => entry.id)).toEqual([2, 3]);
  });
});
