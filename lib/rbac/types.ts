export type BuiltinTier = "superadmin" | "admin" | "supervisor" | "call_center_operator";

export type Sensitivity = "financial" | "pii" | "destructive";

export type ModuleId =
  | "dashboard"
  | "events"
  | "technical"
  | "clients"
  | "specialists"
  | "discounts"
  | "orders"
  | "financial"
  | "clientsReferral"
  | "specialistsReferral"
  | "services"
  | "notifications"
  | "content"
  | "personnel"
  | "userManagement";

export type PermissionAction = "view" | "edit";

export interface ModuleMeta {
  id: ModuleId;
  labelKey: string;
  sensitivity: Sensitivity[];
}

export type ModulePermission = { view: boolean; edit: boolean };
export type RolePermissions = Record<ModuleId, ModulePermission>;

export interface Role {
  id: string;
  name: string;
  description: string;
  builtIn: boolean;
  tier: BuiltinTier | null;
  createdBy: string;
  createdAt: number;
}

export interface RoleGrant {
  id: string;
  adminId: string;
  roleId: string;
  expiresAt: number | null;
  grantedBy: string;
  grantedAt: number;
}

export interface PermissionOverlay {
  id: string;
  adminId: string;
  moduleId: ModuleId;
  action: PermissionAction;
  grantedBy: string;
  grantedAt: number;
}

export interface RolesQuery {
  builtIn?: boolean;
  search?: string;
}
