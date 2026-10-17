import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/query-keys";
import { ADMIN_ACTION_LOGS_PATH, CHANGE_LOGS_PATH } from "@/lib/api/audit-paths";
import { useProbeAllowed } from "@/lib/auth/access-probes";
import { getActionFilterOptions, listAdminActions, listChangeLog, type ListParams } from "./audit-api";

export function useAdminActions(params: ListParams) {
  const allowed = useProbeAllowed(ADMIN_ACTION_LOGS_PATH);
  return useQuery({
    queryKey: queryKeys.adminActions(params),
    queryFn: () => listAdminActions(params),
    placeholderData: keepPreviousData,
    enabled: allowed,
  });
}

export function useAdminActionSearch(search: string, enabled: boolean) {
  const allowed = useProbeAllowed(ADMIN_ACTION_LOGS_PATH);
  return useInfiniteQuery({
    queryKey: ["admin-action-search", search],
    queryFn: ({ pageParam }) => listAdminActions({ page: pageParam, perPage: 10, search: search || undefined }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const meta = lastPage.meta;
      if (!meta) return undefined;
      return meta.current_page < meta.last_page ? meta.current_page + 1 : undefined;
    },
    enabled: allowed && enabled,
    placeholderData: keepPreviousData,
  });
}

export function useActionFilterOptions() {
  const allowed = useProbeAllowed(ADMIN_ACTION_LOGS_PATH);
  return useQuery({
    queryKey: queryKeys.adminActionFilterOptions(),
    queryFn: getActionFilterOptions,
    staleTime: 5 * 60_000,
    enabled: allowed,
  });
}

export function useChangeLog(params: ListParams) {
  const allowed = useProbeAllowed(CHANGE_LOGS_PATH);
  return useQuery({
    queryKey: queryKeys.changeLog(params),
    queryFn: () => listChangeLog(params),
    placeholderData: keepPreviousData,
    enabled: allowed,
  });
}
