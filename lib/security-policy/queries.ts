import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/query-keys";
import { PERMISSIONS, useHasPermission } from "@/lib/auth/permissions";
import { getCurrentPolicy, listPolicyVersions, publishPolicy } from "./policy-api";
import type { StorePolicyBody } from "./dto";

export function useCurrentPolicy() {
  const allowed = useHasPermission(PERMISSIONS.SECURITY_POLICY_VIEW);
  return useQuery({
    queryKey: queryKeys.currentPolicy(),
    queryFn: getCurrentPolicy,
    enabled: allowed,
  });
}

export function usePolicyVersions() {
  const allowed = useHasPermission(PERMISSIONS.SECURITY_POLICY_VIEW);
  return useQuery({
    queryKey: queryKeys.policyVersions(),
    queryFn: listPolicyVersions,
    enabled: allowed,
  });
}

export function usePublishPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: StorePolicyBody) => publishPolicy(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.currentPolicy() });
      qc.invalidateQueries({ queryKey: queryKeys.policyVersions() });
    },
  });
}
