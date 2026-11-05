import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
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
  fetchRevokedInvitations,
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

const ADMIN_USERS = queryKeys.adminUsersRoot();
const ALL_ADMIN_USERS = queryKeys.allAdminUsers();
const PENDING_INVITATIONS = queryKeys.pendingInvitations();
const REVOKED_INVITATIONS = queryKeys.revokedInvitations();
const TARGET_HISTORIES = queryKeys.targetHistories();

export function adminUsersQuery(params: ListParams) {
  return queryOptions({
    queryKey: queryKeys.adminUsers(params),
    queryFn: () => listAdminUsers(params),
    placeholderData: keepPreviousData,
  });
}

export function useAdminUsers(params: ListParams, paused = false) {
  const allowed = useHasPermission(PERMISSIONS.USER_MANAGEMENT_VIEW);
  return useQuery({ ...adminUsersQuery(params), enabled: allowed, refetchOnWindowFocus: !paused });
}

export function useAllAdminUsers(enabled = true) {
  const allowed = useHasPermission(PERMISSIONS.USER_MANAGEMENT_VIEW);
  return useQuery({
    queryKey: ALL_ADMIN_USERS,
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

export function useRevokedInvitations() {
  const allowed = useHasPermission(PERMISSIONS.INVITATIONS_VIEW);
  return useQuery({
    queryKey: REVOKED_INVITATIONS,
    queryFn: fetchRevokedInvitations,
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
    queryKey: queryKeys.invitation(id ?? ""),
    queryFn: () => fetchInvitation(id as string),
    enabled: allowed && Boolean(id),
  });
}

export function useUserDevices(id: string | null) {
  const allowed = useHasPermission(PERMISSIONS.USER_MANAGEMENT_VIEW);
  return useQuery({
    queryKey: queryKeys.userDevices(id ?? ""),
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

type AdminUsersSnapshot = {
  pages: [readonly unknown[], Paginated<AdminUserRow> | undefined][];
  all: AdminUserRow[] | undefined;
};

async function optimisticPatch(
  queryClient: QueryClient,
  predicate: (row: AdminUserRow) => boolean,
  status: AdminUserStatus,
): Promise<AdminUsersSnapshot> {
  await queryClient.cancelQueries({ queryKey: ADMIN_USERS });
  await queryClient.cancelQueries({ queryKey: ALL_ADMIN_USERS });
  const patch = (row: AdminUserRow) => (predicate(row) ? { ...row, status, effectiveStatus: status } : row);
  const snapshot: AdminUsersSnapshot = {
    pages: queryClient.getQueriesData<Paginated<AdminUserRow>>({ queryKey: ADMIN_USERS }),
    all: queryClient.getQueryData<AdminUserRow[]>(ALL_ADMIN_USERS),
  };
  queryClient.setQueriesData<Paginated<AdminUserRow>>({ queryKey: ADMIN_USERS }, (old) =>
    old ? { ...old, data: old.data.map(patch) } : old,
  );
  queryClient.setQueryData<AdminUserRow[]>(ALL_ADMIN_USERS, (old) => old?.map(patch));
  return snapshot;
}

function restore(queryClient: QueryClient, snapshot: AdminUsersSnapshot | undefined) {
  if (!snapshot) return;
  snapshot.pages.forEach(([key, data]) => queryClient.setQueryData(key, data));
  queryClient.setQueryData(ALL_ADMIN_USERS, snapshot.all);
}

function refreshUsers(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ADMIN_USERS });
  void queryClient.invalidateQueries({ queryKey: ALL_ADMIN_USERS });
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
    onSettled: () => refreshUsers(queryClient),
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
      refreshUsers(queryClient);
      queryClient.invalidateQueries({ queryKey: PENDING_INVITATIONS });
      queryClient.invalidateQueries({ queryKey: REVOKED_INVITATIONS });
      queryClient.invalidateQueries({ queryKey: TARGET_HISTORIES });
      queryClient.invalidateQueries({ queryKey: queryKeys.unlinkedStaff() });
    },
  });
}

export function useSendInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ staffId, roleIds }: { staffId: string; roleIds?: string[] }) =>
      sendInvitation(staffId, roleIds),
    onSettled: () => {
      refreshUsers(queryClient);
      queryClient.invalidateQueries({ queryKey: PENDING_INVITATIONS });
      queryClient.invalidateQueries({ queryKey: TARGET_HISTORIES });
      queryClient.invalidateQueries({ queryKey: queryKeys.unlinkedStaff() });
    },
  });
}

export function useResendInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) => resendInvitation(invitationId),
    onSettled: () => {
      refreshUsers(queryClient);
      queryClient.invalidateQueries({ queryKey: PENDING_INVITATIONS });
      queryClient.invalidateQueries({ queryKey: REVOKED_INVITATIONS });
      queryClient.invalidateQueries({ queryKey: TARGET_HISTORIES });
      queryClient.invalidateQueries({ queryKey: queryKeys.unlinkedStaff() });
    },
  });
}

export function useAssignUserRoles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, roleIds }: { id: string; roleIds: string[] }) => assignUserRoles(id, roleIds),
    onSuccess: (_data, { id }) => {
      refreshUsers(queryClient);
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUser(id) });
    },
  });
}
