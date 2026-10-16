import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/query-keys";
import { useAuthed } from "@/lib/auth/use-authed";
import { getCurrentPolicy, listPolicyVersions, publishPolicy } from "./policy-api";
import type { StorePolicyBody } from "./dto";

export function useCurrentPolicy() {
  const authed = useAuthed();
  return useQuery({
    queryKey: queryKeys.currentPolicy(),
    queryFn: getCurrentPolicy,
    enabled: authed,
  });
}

export function usePolicyVersions() {
  const authed = useAuthed();
  return useQuery({
    queryKey: queryKeys.policyVersions(),
    queryFn: listPolicyVersions,
    enabled: authed,
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
