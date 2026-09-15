import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
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

export function useAdminActionSearch(search: string, enabled: boolean) {
  const authed = useAuthed();
  return useInfiniteQuery({
    queryKey: ["admin-action-search", search],
    queryFn: ({ pageParam }) => listAdminActions({ page: pageParam, perPage: 10, search: search || undefined }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const meta = lastPage.meta;
      if (!meta) return undefined;
      return meta.current_page < meta.last_page ? meta.current_page + 1 : undefined;
    },
    enabled: authed && enabled,
    placeholderData: keepPreviousData,
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
