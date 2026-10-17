import { DEFAULT_REGION_EDITOR_PREFS, useUiStore } from "./ui-store";

describe("ui store persistence", () => {
  afterEach(() => localStorage.clear());

  it("drops stored region editor values it doesn't recognise", async () => {
    localStorage.setItem(
      "abapro-ui",
      JSON.stringify({
        state: {
          collapsed: "yes",
          openNavGroups: ["rbacGroup", 7, "rbacGroup", "locationsGroup"],
          regionEditor: { background: "satellite", showGrid: "yes", panelOpen: false, expandedSections: ["map", 4] },
        },
        version: 0,
      }),
    );
    await useUiStore.persist.rehydrate();
    const { collapsed, regionEditor, openNavGroups } = useUiStore.getState();
    expect(collapsed).toBe(false);
    expect(openNavGroups).toEqual(["rbacGroup", "locationsGroup"]);
    expect(regionEditor).toEqual({
      ...DEFAULT_REGION_EDITOR_PREFS,
      panelOpen: false,
      expandedSections: ["map"],
    });
  });

  it("keeps a valid last map view and drops a broken one", async () => {
    const view = { center: [54.9, 24.1], zoom: 11, countryId: 1, owner: "u-1" };
    localStorage.setItem("abapro-ui", JSON.stringify({ state: { lastMapView: view }, version: 0 }));
    await useUiStore.persist.rehydrate();
    expect(useUiStore.getState().lastMapView).toEqual(view);

    localStorage.setItem(
      "abapro-ui",
      JSON.stringify({ state: { lastMapView: { ...view, center: [54.9, 120] } }, version: 0 }),
    );
    await useUiStore.persist.rehydrate();
    expect(useUiStore.getState().lastMapView).toBeNull();
  });
});
