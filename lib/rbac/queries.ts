import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/query-keys";
import { PERMISSIONS, useHasPermission } from "@/lib/auth/permissions";
import {
  attachUserRoles,
  createRole,
  deleteRole,
  detachUserRoles,
  getAdminAccess,
  getRole,
  listPermissionModules,
  listPermissions,
  listRoles,
  syncRolePermissions,
  syncUserPermissions,
  updateRole,
  type AdminAccess,
  type ListParams,
} from "./rbac-api";
import type { RoleDto, StoreRoleBody, UpdateRoleBody } from "./dto";

export function useRoles(params: ListParams) {
  const allowed = useHasPermission(PERMISSIONS.ROLES_VIEW);
  return useQuery({
    queryKey: [...queryKeys.roles(), params],
    queryFn: () => listRoles(params),
    placeholderData: keepPreviousData,
    enabled: allowed,
  });
}

export function useRole(id: number) {
  const allowed = useHasPermission(PERMISSIONS.ROLES_VIEW);
  return useQuery({
    queryKey: queryKeys.roleDetail(id),
    queryFn: () => getRole(id),
    enabled: allowed && Number.isFinite(id) && id > 0,
  });
}

export function usePermissionModules() {
  const allowed = useHasPermission(PERMISSIONS.PERMISSIONS_VIEW);
  return useQuery({
    queryKey: queryKeys.permissionModules(),
    queryFn: listPermissionModules,
    enabled: allowed,
  });
}

export function usePermissions() {
  const allowed = useHasPermission(PERMISSIONS.PERMISSIONS_VIEW);
  return useQuery({ queryKey: queryKeys.permissions(), queryFn: listPermissions, enabled: allowed });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: StoreRoleBody) => createRole(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.roles() }),
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateRoleBody }) => updateRole(id, body),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.roles() });
      qc.invalidateQueries({ queryKey: queryKeys.roleDetail(id) });
    },
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteRole(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.roles() }),
  });
}

export function useSyncRolePermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, permissionIds }: { id: number; permissionIds: number[] }) =>
      syncRolePermissions(id, permissionIds),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.roleDetail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.roles() });
    },
  });
}

export function useAdminAccess(userId: string | null) {
  const allowed = useHasPermission(PERMISSIONS.USER_MANAGEMENT_VIEW);
  return useQuery({
    queryKey: queryKeys.adminAccess(userId ?? ""),
    queryFn: () => getAdminAccess(userId as string),
    enabled: allowed && Boolean(userId),
  });
}

function setAccessRoles(qc: ReturnType<typeof useQueryClient>, userId: string, roles: RoleDto[]) {
  qc.setQueryData<AdminAccess>(queryKeys.adminAccess(userId), (previous) => ({
    roles,
    permissions: previous?.permissions ?? [],
    effectivePermissionCount: previous?.effectivePermissionCount ?? 0,
  }));
}

function refreshAccess(qc: ReturnType<typeof useQueryClient>, userId: string) {
  void qc.invalidateQueries({ queryKey: queryKeys.adminAccess(userId) });
  void qc.invalidateQueries({ queryKey: ["admin-users"] });
}

export function useAttachUserRoles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roleIds, expiresAt }: { userId: string; roleIds: number[]; expiresAt?: string | null }) =>
      attachUserRoles(userId, roleIds, expiresAt),
    onSuccess: (roles, { userId }) => {
      setAccessRoles(qc, userId, roles);
      refreshAccess(qc, userId);
    },
  });
}

export function useDetachUserRoles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roleIds }: { userId: string; roleIds: number[] }) =>
      detachUserRoles(userId, roleIds),
    onSuccess: (roles, { userId }) => {
      setAccessRoles(qc, userId, roles);
      refreshAccess(qc, userId);
    },
  });
}

export function useSyncUserPermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, permissionIds }: { userId: string; permissionIds: number[] }) =>
      syncUserPermissions(userId, permissionIds),
    onSuccess: (assignment, { userId }) => {
      qc.setQueryData<AdminAccess>(queryKeys.adminAccess(userId), (previous) => ({
        roles: previous?.roles ?? assignment.roles,
        permissions: assignment.direct_permissions,
        effectivePermissionCount: previous?.effectivePermissionCount ?? 0,
      }));
      refreshAccess(qc, userId);
    },
  });
}
