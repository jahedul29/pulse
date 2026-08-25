import { usePolicyStore } from "./store";
import type { PolicyVersion } from "./types";

export async function fetchPolicyVersions(): Promise<PolicyVersion[]> {
  return [...usePolicyStore.getState().versions].sort((a, b) => b.effectiveFrom - a.effectiveFrom);
}
