import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/query-keys";
import { useAuthed } from "@/lib/auth/use-authed";
import { listLoginAudit, type ListParams } from "./audit-api";

export function useLoginAudit(params: ListParams) {
  const authed = useAuthed();
  return useQuery({
    queryKey: queryKeys.loginAudit(params),
    queryFn: () => listLoginAudit(params),
    placeholderData: keepPreviousData,
    enabled: authed,
  });
}
