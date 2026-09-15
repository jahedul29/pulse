import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/query-keys";
import type { Paginated } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/store";
import {
  assignUserRoles,
  fetchAdminUserDetail,
  fetchInvitableStaff,
  fetchLinkedStaffIds,
  fetchPendingInvitationMap,
  listAdminUsers,
  listAllAdminUsers,
  revokeInvitation,
  sendInvitation,
  updateUserStatus,
  type ListParams,
} from "./users-api";
import type { AdminUserRow, AdminUserStatus } from "./types";

const ADMIN_USERS = ["admin-users"] as const;
const INVITATION_MAP = ["invitation-map"] as const;
const LINKED_STAFF = ["linked-staff-ids"] as const;

function useAuthed() {
  return useAuthStore((state) => Boolean(state.session?.accessToken ?? state.session?.token));
}

export function useAdminUsers(params: ListParams) {
  const authed = useAuthed();
  return useQuery({
    queryKey: queryKeys.adminUsers(params),
    queryFn: () => listAdminUsers(params),
    placeholderData: keepPreviousData,
    enabled: authed,
  });
}

export function useAllAdminUsers(enabled = true) {
  const authed = useAuthed();
  return useQuery({
    queryKey: ["admin-users-all"],
    queryFn: listAllAdminUsers,
    enabled: authed && enabled,
  });
}

export function useAdminUserSearch(search: string, enabled: boolean) {
  const authed = useAuthed();
  return useInfiniteQuery({
    queryKey: ["admin-user-search", search],
    queryFn: ({ pageParam }) => listAdminUsers({ page: pageParam, perPage: 10, search: search || undefined }),
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

export function usePendingInvitationMap() {
  const authed = useAuthed();
  return useQuery({ queryKey: INVITATION_MAP, queryFn: fetchPendingInvitationMap, enabled: authed });
}

export function useAdminUser(id: string | null) {
  const authed = useAuthed();
  return useQuery({
    queryKey: queryKeys.adminUser(id ?? ""),
    queryFn: () => fetchAdminUserDetail(id as string),
    enabled: authed && Boolean(id),
  });
}

export function useInvitableStaff(search: string, enabled = true) {
  const authed = useAuthed();
  return useQuery({
    queryKey: [...queryKeys.unlinkedStaff(), search],
    queryFn: () => fetchInvitableStaff(search),
    enabled: authed && enabled,
    placeholderData: keepPreviousData,
  });
}

export function useLinkedStaffIds(enabled = true) {
  const authed = useAuthed();
  return useQuery({ queryKey: LINKED_STAFF, queryFn: fetchLinkedStaffIds, enabled: authed && enabled });
}

type AdminUsersSnapshot = [readonly unknown[], Paginated<AdminUserRow> | undefined][];

async function optimisticPatch(
  queryClient: QueryClient,
  predicate: (row: AdminUserRow) => boolean,
  status: AdminUserStatus,
): Promise<AdminUsersSnapshot> {
  await queryClient.cancelQueries({ queryKey: ADMIN_USERS });
  const snapshot = queryClient.getQueriesData<Paginated<AdminUserRow>>({ queryKey: ADMIN_USERS });
  queryClient.setQueriesData<Paginated<AdminUserRow>>({ queryKey: ADMIN_USERS }, (old) =>
    old
      ? {
          ...old,
          data: old.data.map((row) =>
            predicate(row) ? { ...row, status, effectiveStatus: status } : row,
          ),
        }
      : old,
  );
  return snapshot;
}

function restore(queryClient: QueryClient, snapshot: AdminUsersSnapshot | undefined) {
  snapshot?.forEach(([key, data]) => queryClient.setQueryData(key, data));
}

interface StatusVars {
  id: string;
  status: AdminUserStatus;
  reason?: string;
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, reason }: StatusVars) => updateUserStatus(id, status, reason),
    onMutate: ({ id, status }) => optimisticPatch(queryClient, (row) => row.id === id, status),
    onError: (_error, _vars, snapshot) => restore(queryClient, snapshot),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ADMIN_USERS }),
  });
}

export function useRevokeInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) => revokeInvitation(invitationId),
    onMutate: (invitationId) =>
      optimisticPatch(queryClient, (row) => row.invitationId === invitationId, "revoked"),
    onError: (_error, _vars, snapshot) => restore(queryClient, snapshot),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS });
      queryClient.invalidateQueries({ queryKey: INVITATION_MAP });
    },
  });
}

export function useSendInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (staffId: string) => sendInvitation(staffId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS });
      queryClient.invalidateQueries({ queryKey: INVITATION_MAP });
      queryClient.invalidateQueries({ queryKey: LINKED_STAFF });
      queryClient.invalidateQueries({ queryKey: queryKeys.unlinkedStaff() });
    },
  });
}

export function useAssignUserRoles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, roleIds }: { id: string; roleIds: string[] }) => assignUserRoles(id, roleIds),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUser(id) });
    },
  });
}
