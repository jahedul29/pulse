import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ProbeResults } from "./access";
import { sessionOwner, useAuthStore } from "./store";

const EMPTY_RESULTS: ProbeResults = {};

interface AccessProbeState {
  owner: string | null;
  results: ProbeResults;
  record: (owner: string | null, results: ProbeResults) => void;
}

function booleanEntries(value: unknown): ProbeResults {
  if (!value || typeof value !== "object" || Array.isArray(value)) return EMPTY_RESULTS;
  return Object.fromEntries(Object.entries(value).filter(([, allowed]) => typeof allowed === "boolean"));
}

export const useAccessProbes = create<AccessProbeState>()(
  persist(
    (set) => ({
      owner: null,
      results: EMPTY_RESULTS,
      record: (owner, results) =>
        set((state) => {
          const base = state.owner === owner ? state.results : EMPTY_RESULTS;
          const merged = { ...base, ...results };
          const unchanged =
            state.owner === owner &&
            Object.keys(merged).length === Object.keys(state.results).length &&
            Object.entries(merged).every(([endpoint, allowed]) => state.results[endpoint] === allowed);
          return unchanged ? state : { owner, results: merged };
        }),
    }),
    {
      name: "abapro-access-probes",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ owner: state.owner, results: state.results }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<Pick<AccessProbeState, "owner" | "results">>;
        return {
          ...current,
          owner: typeof saved.owner === "string" ? saved.owner : null,
          results: booleanEntries(saved.results),
        };
      },
    },
  ),
);

function resultsFor(state: AccessProbeState, owner: string | null): ProbeResults {
  return owner && state.owner === owner ? state.results : EMPTY_RESULTS;
}

export function useProbeResults(): ProbeResults {
  const owner = useAuthStore((state) => sessionOwner(state.session));
  return useAccessProbes((state) => resultsFor(state, owner));
}

export function currentProbeResults(): ProbeResults {
  return resultsFor(useAccessProbes.getState(), sessionOwner(useAuthStore.getState().session));
}

export function useProbeAllowed(endpoint: string): boolean {
  return useProbeResults()[endpoint] === true;
}

export function useProbeDenied(endpoint: string): boolean {
  return useProbeResults()[endpoint] === false;
}

export function useAccessSnapshot() {
  const session = useAuthStore((state) => state.session);
  const probes = useProbeResults();
  return { session, probes };
}
