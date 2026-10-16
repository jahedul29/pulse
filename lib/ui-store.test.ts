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
});
