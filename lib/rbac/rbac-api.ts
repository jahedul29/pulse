import { apiData, apiFetch, apiList } from "@/lib/api/client";
import type { Paginated } from "@/lib/api/client";
import { ADMIN_IDENTITY } from "@/lib/api/config";
import { buildListQuery, listAll, type ListParams } from "@/lib/api/list-query";
import type {
  AdminAccountAssignmentDto,
  GrantedRoleDto,
  PermissionDto,
  PermissionModuleDto,
  RoleDto,
  StoreRoleBody,
  UpdateRoleBody,
} from "./dto";

const ROLES = `${ADMIN_IDENTITY}/roles`;
const PERMISSIONS = `${ADMIN_IDENTITY}/permissions`;
const MODULES = `${ADMIN_IDENTITY}/permission-modules`;
const USERS = `${ADMIN_IDENTITY}/users`;

export interface AdminAccess {
  roles: GrantedRoleDto[];
  permissions: PermissionDto[];
}

export async function getAdminAccess(userId: string): Promise<AdminAccess> {
  const user = await apiData<{
    roles?: GrantedRoleDto[];
    permissions?: PermissionDto[];
    direct_permissions?: PermissionDto[];
  }>(`${USERS}/${encodeURIComponent(userId)}`, { query: { relations: ["roles", "permissions"] } });
  return { roles: user.roles ?? [], permissions: user.direct_permissions ?? user.permissions ?? [] };
}

export function attachUserRoles(userId: string, roleIds: number[]): Promise<RoleDto[]> {
  return apiData<RoleDto[]>(`${USERS}/${encodeURIComponent(userId)}/roles`, { method: "POST", body: { role_ids: roleIds } });
}

export function detachUserRoles(userId: string, roleIds: number[]): Promise<RoleDto[]> {
  return apiData<RoleDto[]>(`${USERS}/${encodeURIComponent(userId)}/roles`, { method: "DELETE", body: { role_ids: roleIds } });
}

export function syncUserPermissions(
  userId: string,
  permissionIds: number[],
): Promise<AdminAccountAssignmentDto> {
  return apiData<AdminAccountAssignmentDto>(`${USERS}/${encodeURIComponent(userId)}/permissions`, {
    method: "PUT",
    body: { permission_ids: permissionIds },
  });
}

export type { ListParams };

export async function listRoles(params: ListParams = {}): Promise<Paginated<RoleDto>> {
  const { data, meta } = await apiList<RoleDto>(ROLES, { query: buildListQuery(params) });
  return { data, meta };
}

export function getRole(id: number): Promise<RoleDto> {
  return apiData<RoleDto>(`${ROLES}/${encodeURIComponent(String(id))}`, { query: { relations: ["permissions"] } });
}

export function createRole(body: StoreRoleBody): Promise<RoleDto> {
  return apiData<RoleDto>(ROLES, { method: "POST", body });
}

export function updateRole(id: number, body: UpdateRoleBody): Promise<RoleDto> {
  return apiData<RoleDto>(`${ROLES}/${encodeURIComponent(String(id))}`, { method: "PUT", body });
}

export function deleteRole(id: number): Promise<unknown> {
  return apiFetch(`${ROLES}/${encodeURIComponent(String(id))}`, { method: "DELETE" });
}

export function syncRolePermissions(id: number, permissionIds: number[]): Promise<unknown> {
  return apiFetch(`${ROLES}/${encodeURIComponent(String(id))}/permissions`, {
    method: "PUT",
    body: { permission_ids: permissionIds },
  });
}

export function listPermissionModules(): Promise<PermissionModuleDto[]> {
  return listAll<PermissionModuleDto>(MODULES);
}

export function listPermissions(): Promise<PermissionDto[]> {
  return listAll<PermissionDto>(PERMISSIONS);
}
