import { keepPreviousData, useInfiniteQuery, useQuery, queryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/query-keys";
import { ADMIN_ACTION_LOGS_PATH, CHANGE_LOGS_PATH } from "@/lib/api/audit-paths";
import { useProbeAllowed } from "@/lib/auth/access-probes";
import {
  countActionChanges,
  findPreviousChange,
  getActionFilterOptions,
  listAdminActions,
  listChangeLog,
  listTargetHistory,
  type ListParams,
} from "./audit-api";
import type { ChangeLogEntry } from "./types";

export function adminActionsQuery(params: ListParams) {
  return queryOptions({
    queryKey: queryKeys.adminActions(params),
    queryFn: () => listAdminActions(params),
    placeholderData: keepPreviousData,
  });
}

export function useAdminActions(params: ListParams, paused = false) {
  const allowed = useProbeAllowed(ADMIN_ACTION_LOGS_PATH);
  return useQuery({ ...adminActionsQuery(params), enabled: allowed, refetchOnWindowFocus: !paused });
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

export function changeLogQuery(params: ListParams) {
  return queryOptions({
    queryKey: queryKeys.changeLog(params),
    queryFn: () => listChangeLog(params),
    placeholderData: keepPreviousData,
  });
}

export function useChangeLog(params: ListParams, paused = false) {
  const allowed = useProbeAllowed(CHANGE_LOGS_PATH);
  return useQuery({ ...changeLogQuery(params), enabled: allowed, refetchOnWindowFocus: !paused });
}

export function useActionChangeCount(actionId: string | null) {
  const allowed = useProbeAllowed(CHANGE_LOGS_PATH);
  return useQuery({
    queryKey: queryKeys.actionChangeCount(actionId ?? ""),
    queryFn: () => countActionChanges(actionId ?? ""),
    enabled: allowed && actionId != null,
    staleTime: 60_000,
  });
}

export function usePreviousChange(entry: ChangeLogEntry | null) {
  const allowed = useProbeAllowed(CHANGE_LOGS_PATH);
  return useQuery({
    queryKey: queryKeys.previousChange(entry?.id ?? ""),
    queryFn: () => (entry ? findPreviousChange(entry) : Promise.resolve(null)),
    enabled: allowed && entry != null && entry.prevRowHash != null,
    staleTime: 5 * 60_000,
  });
}

export function useTargetHistory(targetId: string | null) {
  const allowed = useProbeAllowed(ADMIN_ACTION_LOGS_PATH);
  return useQuery({
    queryKey: queryKeys.targetHistory(targetId ?? ""),
    queryFn: () => listTargetHistory(targetId ?? ""),
    enabled: allowed && targetId != null,
  });
}
