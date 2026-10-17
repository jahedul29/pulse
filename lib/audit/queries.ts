import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/query-keys";
import { LOGIN_AUDIT_LOGS_PATH } from "@/lib/api/audit-paths";
import { useProbeAllowed } from "@/lib/auth/access-probes";
import { listLoginAudit, type ListParams } from "./audit-api";

export function useLoginAudit(params: ListParams) {
  const allowed = useProbeAllowed(LOGIN_AUDIT_LOGS_PATH);
  return useQuery({
    queryKey: queryKeys.loginAudit(params),
    queryFn: () => listLoginAudit(params),
    placeholderData: keepPreviousData,
    enabled: allowed,
  });
}
