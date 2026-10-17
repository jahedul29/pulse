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
import { PERMISSIONS, useHasPermission } from "@/lib/auth/permissions";
import {
  assignUserRoles,
  fetchAdminUserDetail,
  fetchInvitableStaff,
  fetchInvitation,
  fetchPendingInvitations,
  fetchUserDevices,
  listAdminUsers,
  listAllAdminUsers,
  resendInvitation,
  revokeInvitation,
  sendInvitation,
  updateUserStatus,
  type ListParams,
} from "./users-api";
import type { AdminUserRow, AdminUserStatus } from "./types";

const ADMIN_USERS = ["admin-users"] as const;
const PENDING_INVITATIONS = ["pending-invitations"] as const;

export function useAdminUsers(params: ListParams) {
  const allowed = useHasPermission(PERMISSIONS.USER_MANAGEMENT_VIEW);
  return useQuery({
    queryKey: queryKeys.adminUsers(params),
    queryFn: () => listAdminUsers(params),
    placeholderData: keepPreviousData,
    enabled: allowed,
  });
}

export function useAllAdminUsers(enabled = true) {
  const allowed = useHasPermission(PERMISSIONS.USER_MANAGEMENT_VIEW);
  return useQuery({
    queryKey: ["admin-users-all"],
    queryFn: listAllAdminUsers,
    enabled: allowed && enabled,
  });
}

export function useAdminUserSearch(search: string, enabled: boolean) {
  const allowed = useHasPermission(PERMISSIONS.USER_MANAGEMENT_VIEW);
  return useInfiniteQuery({
    queryKey: ["admin-user-search", search],
    queryFn: ({ pageParam }) => listAdminUsers({ page: pageParam, perPage: 10, search: search || undefined }),
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

export function usePendingInvitations() {
  const allowed = useHasPermission(PERMISSIONS.INVITATIONS_VIEW);
  return useQuery({
    queryKey: PENDING_INVITATIONS,
    queryFn: fetchPendingInvitations,
    enabled: allowed,
  });
}

export function useAdminUser(id: string | null) {
  const allowed = useHasPermission(PERMISSIONS.USER_MANAGEMENT_VIEW);
  return useQuery({
    queryKey: queryKeys.adminUser(id ?? ""),
    queryFn: () => fetchAdminUserDetail(id as string),
    enabled: allowed && Boolean(id),
  });
}

export function useInvitation(id: string | null) {
  const allowed = useHasPermission(PERMISSIONS.INVITATIONS_VIEW);
  return useQuery({
    queryKey: [...PENDING_INVITATIONS, "detail", id ?? ""],
    queryFn: () => fetchInvitation(id as string),
    enabled: allowed && Boolean(id),
  });
}

export function useUserDevices(id: string | null) {
  const allowed = useHasPermission(PERMISSIONS.USER_MANAGEMENT_VIEW);
  return useQuery({
    queryKey: ["user-devices", id],
    queryFn: () => fetchUserDevices(id as string),
    enabled: allowed && id != null,
  });
}

export function useInvitableStaff(search: string, enabled = true) {
  const allowed = useHasPermission(PERMISSIONS.STAFF_VIEW);
  return useQuery({
    queryKey: [...queryKeys.unlinkedStaff(), search],
    queryFn: () => fetchInvitableStaff(search),
    enabled: allowed && enabled,
    placeholderData: keepPreviousData,
  });
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
      queryClient.invalidateQueries({ queryKey: PENDING_INVITATIONS });
    },
  });
}

export function useSendInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ staffId, roleIds }: { staffId: string; roleIds?: string[] }) =>
      sendInvitation(staffId, roleIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS });
      queryClient.invalidateQueries({ queryKey: PENDING_INVITATIONS });
      queryClient.invalidateQueries({ queryKey: queryKeys.unlinkedStaff() });
    },
  });
}

export function useResendInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) => resendInvitation(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS });
      queryClient.invalidateQueries({ queryKey: PENDING_INVITATIONS });
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
