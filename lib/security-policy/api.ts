import { usePolicyStore } from "./store";
import type { PolicyVersion, SecurityPolicy } from "./types";

export async function fetchPolicyVersions(): Promise<PolicyVersion[]> {
  return [...usePolicyStore.getState().versions].sort((a, b) => b.effectiveFrom - a.effectiveFrom);
}

export async function fetchCurrentPolicy(): Promise<SecurityPolicy | null> {
  return usePolicyStore.getState().versions.find((v) => v.effectiveTo == null)?.policy ?? null;
}
