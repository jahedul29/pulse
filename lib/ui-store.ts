import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_MAP_BACKGROUND, isMapBackground, type MapBackground } from "@/lib/region-builder/backgrounds";

export interface RegionEditorPrefs {
  background: MapBackground;
  showGrid: boolean;
  showOtherRegions: boolean;
  panelOpen: boolean;
  expandedSections: string[];
}

export const DEFAULT_REGION_EDITOR_PREFS: RegionEditorPrefs = {
  background: DEFAULT_MAP_BACKGROUND,
  showGrid: true,
  showOtherRegions: true,
  panelOpen: true,
  expandedSections: ["centre", "map", "selection"],
};

function regionEditorPrefs(saved: Partial<RegionEditorPrefs> | undefined): RegionEditorPrefs {
  const prefs = { ...DEFAULT_REGION_EDITOR_PREFS, ...saved };
  return {
    background: isMapBackground(prefs.background) ? prefs.background : DEFAULT_REGION_EDITOR_PREFS.background,
    showGrid: typeof prefs.showGrid === "boolean" ? prefs.showGrid : DEFAULT_REGION_EDITOR_PREFS.showGrid,
    showOtherRegions:
      typeof prefs.showOtherRegions === "boolean" ? prefs.showOtherRegions : DEFAULT_REGION_EDITOR_PREFS.showOtherRegions,
    panelOpen: typeof prefs.panelOpen === "boolean" ? prefs.panelOpen : DEFAULT_REGION_EDITOR_PREFS.panelOpen,
    expandedSections: Array.isArray(prefs.expandedSections)
      ? prefs.expandedSections.filter((section): section is string => typeof section === "string")
      : DEFAULT_REGION_EDITOR_PREFS.expandedSections,
  };
}

interface UiState {
  collapsed: boolean;
  toggleCollapsed: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  regionEditor: RegionEditorPrefs;
  setRegionEditor: (patch: Partial<RegionEditorPrefs>) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      collapsed: false,
      toggleCollapsed: () => set((state) => ({ collapsed: !state.collapsed })),
      mobileOpen: false,
      setMobileOpen: (open) => set({ mobileOpen: open }),
      regionEditor: DEFAULT_REGION_EDITOR_PREFS,
      setRegionEditor: (patch) => set((state) => ({ regionEditor: { ...state.regionEditor, ...patch } })),
    }),
    {
      name: "abapro-ui",
      partialize: (state) => ({ collapsed: state.collapsed, regionEditor: state.regionEditor }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<Pick<UiState, "collapsed" | "regionEditor">>;
        return {
          ...current,
          collapsed: typeof saved.collapsed === "boolean" ? saved.collapsed : current.collapsed,
          regionEditor: regionEditorPrefs(saved.regionEditor),
        };
      },
    },
  ),
);
