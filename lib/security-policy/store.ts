import { create } from "zustand";
import { seedVersions } from "./mock";
import type { PolicyVersion, SecurityPolicy } from "./types";

let seq = 0;
function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `pol-${crypto.randomUUID()}`;
  return `pol-${Date.now()}-${seq++}`;
}

interface PolicyState {
  versions: PolicyVersion[];
  savePolicy: (policy: SecurityPolicy, reason: string, by: string) => void;
}

export const usePolicyStore = create<PolicyState>((set) => ({
  versions: seedVersions(),
  savePolicy: (policy, reason, by) =>
    set((s) => {
      const now = Date.now();
      const closed = s.versions.map((v) => (v.effectiveTo == null ? { ...v, effectiveTo: now } : v));
      return {
        versions: [
          ...closed,
          { id: uid(), policy, effectiveFrom: now, effectiveTo: null, reason, changedBy: by },
        ],
      };
    }),
}));
