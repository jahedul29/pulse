import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/query-keys";
import { useAuthStore } from "@/lib/auth/store";
import { listAdminActions, listChangeLog, type ListParams } from "./audit-api";

function useAuthed() {
  return useAuthStore((state) => Boolean(state.session?.accessToken ?? state.session?.token));
}

export function useAdminActions(params: ListParams) {
  const authed = useAuthed();
  return useQuery({
    queryKey: queryKeys.adminActions(params),
    queryFn: () => listAdminActions(params),
    placeholderData: keepPreviousData,
    enabled: authed,
  });
}

export function useChangeLog(params: ListParams) {
  const authed = useAuthed();
  return useQuery({
    queryKey: queryKeys.changeLog(params),
    queryFn: () => listChangeLog(params),
    placeholderData: keepPreviousData,
    enabled: authed,
  });
}
