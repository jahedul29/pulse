import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/query-keys";
import { useAuthStore } from "@/lib/auth/store";
import { listLoginAudit, type ListParams } from "./audit-api";

function useAuthed() {
  return useAuthStore((state) => Boolean(state.session?.accessToken ?? state.session?.token));
}

export function useLoginAudit(params: ListParams) {
  const authed = useAuthed();
  return useQuery({
    queryKey: queryKeys.loginAudit(params),
    queryFn: () => listLoginAudit(params),
    placeholderData: keepPreviousData,
    enabled: authed,
  });
}
