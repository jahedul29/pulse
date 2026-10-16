import { startAttributionCollapsed } from "./attribution";

function fakeMap() {
  const root = document.createElement("div");
  root.innerHTML =
    '<details class="maplibregl-ctrl-attrib maplibregl-compact"><summary>i</summary><div>OpenFreeMap</div></details>';
  const listeners: Array<() => void> = [];
  const attribution = root.querySelector("details")!;
  return {
    attribution,
    emit: () => listeners.forEach((listener) => listener()),
    map: { getContainer: () => root, on: (_type: string, listener: () => void) => listeners.push(listener) },
  };
}

describe("startAttributionCollapsed", () => {
  it("keeps the map credit collapsed when MapLibre expands it after loading", () => {
    const { attribution, emit, map } = fakeMap();
    startAttributionCollapsed(map);
    attribution.classList.add("maplibregl-compact-show");
    emit();
    expect(attribution).not.toHaveClass("maplibregl-compact-show");
    expect(attribution).toHaveClass("maplibregl-compact");
  });

  it("leaves it open once the user opens it", () => {
    const { attribution, emit, map } = fakeMap();
    startAttributionCollapsed(map);
    attribution.querySelector("summary")!.click();
    attribution.classList.add("maplibregl-compact-show");
    emit();
    expect(attribution).toHaveClass("maplibregl-compact-show");
  });
});
