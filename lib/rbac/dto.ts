export interface PermissionModuleDto {
  id: number;
  code: string;
  name: string;
  display_order: number;
}

export interface PermissionDto {
  id: number;
  module_id: number;
  module?: { id: number; code: string; name: string } | null;
  resource?: { resource?: string; name?: string; code?: string; action?: string } | string | null;
  action: string;
  code?: string;
  name?: string;
  description?: string;
  is_sensitive: boolean;
  created_at?: string;
}

export interface RoleDto {
  id: number;
  name: string;
  description?: string;
  is_system: boolean;
  permissions?: PermissionDto[];
  created_at?: string;
  updated_at?: string;
}

export interface StoreRoleBody {
  name: string;
  description?: string;
  is_system?: boolean;
}

export interface UpdateRoleBody {
  name?: string;
  description?: string;
}

export function resourceName(permission: PermissionDto): string {
  const resource = permission.resource;
  if (resource && typeof resource === "object") return resource.resource ?? resource.name ?? "";
  return typeof resource === "string" ? resource : "";
}

export function permissionCode(permission: PermissionDto): string {
  if (permission.code) return permission.code;
  const resource = resourceName(permission);
  return resource ? `${resource}:${permission.action}` : permission.action;
}

export function permissionLabel(permission: PermissionDto): string {
  if (permission.description && permission.description.trim()) return permission.description;
  return permissionCode(permission);
}
