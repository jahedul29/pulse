import { useRbacStore } from "./store";
import { emptyPermissions, fullPermissions, MODULE_IDS } from "./modules";
import type { Role, RoleGrant, PermissionOverlay, RolePermissions, RolesQuery } from "./types";

export async function fetchRoles(query: RolesQuery = {}): Promise<Role[]> {
  const { builtIn, search } = query;
  const term = search?.trim().toLowerCase();
  return useRbacStore
    .getState()
    .roles.filter((role) => builtIn == null || role.builtIn === builtIn)
    .filter(
      (role) =>
        !term || role.name.toLowerCase().includes(term) || role.description.toLowerCase().includes(term),
    )
    .sort((first, second) => {
      if (first.builtIn !== second.builtIn) return first.builtIn ? -1 : 1;
      return first.createdAt - second.createdAt;
    });
}

export async function fetchRolePermissions(roleId: string): Promise<RolePermissions> {
  return useRbacStore.getState().permissions[roleId] ?? emptyPermissions();
}

export async function fetchAdminAccess(
  adminId: string,
): Promise<{ grants: RoleGrant[]; overlays: PermissionOverlay[] }> {
  const { grants, overlays } = useRbacStore.getState();
  return {
    grants: grants
      .filter((grant) => grant.adminId === adminId)
      .sort((first, second) => second.grantedAt - first.grantedAt),
    overlays: overlays
      .filter((overlay) => overlay.adminId === adminId)
      .sort((first, second) => second.grantedAt - first.grantedAt),
  };
}

const EXPIRING_SOON_MS = 7 * 86_400_000;

export function roleExpiryStatus(
  expiresAt: number | null,
): "permanent" | "expired" | "soon" | "active" {
  if (expiresAt == null) return "permanent";
  const delta = expiresAt - Date.now();
  if (delta < 0) return "expired";
  if (delta < EXPIRING_SOON_MS) return "soon";
  return "active";
}

export async function effectivePermissions(adminId: string): Promise<{
  permissions: RolePermissions;
  activeRoleIds: string[];
  expiredGrantCount: number;
}> {
  const { grants, overlays, roles, permissions } = useRbacStore.getState();
  const roleById = new Map(roles.map((role) => [role.id, role]));
  const mine = grants.filter((grant) => grant.adminId === adminId);
  const active = mine.filter((grant) => roleExpiryStatus(grant.expiresAt) !== "expired");
  const result = emptyPermissions();
  const activeRoleIds: string[] = [];
  active.forEach((grant) => {
    const role = roleById.get(grant.roleId);
    if (!role) return;
    activeRoleIds.push(grant.roleId);
    const perms =
      role.tier === "superadmin" ? fullPermissions() : (permissions[grant.roleId] ?? emptyPermissions());
    MODULE_IDS.forEach((moduleId) => {
      if (perms[moduleId].view) result[moduleId].view = true;
      if (perms[moduleId].edit) {
        result[moduleId].view = true;
        result[moduleId].edit = true;
      }
    });
  });
  overlays
    .filter((overlay) => overlay.adminId === adminId)
    .forEach((overlay) => {
      result[overlay.moduleId].view = true;
      if (overlay.action === "edit") result[overlay.moduleId].edit = true;
    });
  return { permissions: result, activeRoleIds, expiredGrantCount: mine.length - active.length };
}
