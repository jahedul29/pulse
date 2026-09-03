import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/query-keys";
import { useAuthStore } from "@/lib/auth/store";
import {
  createRole,
  deleteRole,
  getRole,
  listPermissionModules,
  listPermissions,
  listRoles,
  syncRolePermissions,
  updateRole,
  type ListParams,
} from "./rbac-api";
import type { StoreRoleBody, UpdateRoleBody } from "./dto";

function useAuthed() {
  return useAuthStore((state) => Boolean(state.session?.accessToken ?? state.session?.token));
}

export function useRoles(params: ListParams) {
  const authed = useAuthed();
  return useQuery({
    queryKey: [...queryKeys.roles(), params],
    queryFn: () => listRoles(params),
    placeholderData: keepPreviousData,
    enabled: authed,
  });
}

export function useRole(id: number) {
  const authed = useAuthed();
  return useQuery({
    queryKey: queryKeys.roleDetail(id),
    queryFn: () => getRole(id),
    enabled: authed && Number.isFinite(id) && id > 0,
  });
}

export function usePermissionModules() {
  const authed = useAuthed();
  return useQuery({
    queryKey: queryKeys.permissionModules(),
    queryFn: listPermissionModules,
    enabled: authed,
  });
}

export function usePermissions() {
  const authed = useAuthed();
  return useQuery({ queryKey: queryKeys.permissions(), queryFn: listPermissions, enabled: authed });
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
