import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UiState {
  collapsed: boolean;
  toggleCollapsed: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      collapsed: false,
      toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
      mobileOpen: false,
      setMobileOpen: (open) => set({ mobileOpen: open }),
    }),
    {
      name: "abapro-ui",
      partialize: (s) => ({ collapsed: s.collapsed }),
    },
  ),
);
