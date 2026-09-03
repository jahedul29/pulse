import { usePolicyStore } from "./store";
import type { PolicyVersion, SecurityPolicy } from "./types";

export async function fetchPolicyVersions(): Promise<PolicyVersion[]> {
  return [...usePolicyStore.getState().versions].sort(
    (versionA, versionB) => versionB.effectiveFrom - versionA.effectiveFrom,
  );
}

export async function fetchCurrentPolicy(): Promise<SecurityPolicy | null> {
  return usePolicyStore.getState().versions.find((version) => version.effectiveTo == null)?.policy ?? null;
}
