import { useRbacStore } from "./store";
import { emptyPermissions, fullPermissions, MODULE_IDS } from "./modules";
import type { Role, RoleGrant, PermissionOverlay, RolePermissions, RolesQuery } from "./types";

export async function fetchRoles(query: RolesQuery = {}): Promise<Role[]> {
  const { builtIn, search } = query;
  const term = search?.trim().toLowerCase();
  return useRbacStore
    .getState()
    .roles.filter((r) => builtIn == null || r.builtIn === builtIn)
    .filter((r) => !term || r.name.toLowerCase().includes(term) || r.description.toLowerCase().includes(term))
    .sort((a, b) => {
      if (a.builtIn !== b.builtIn) return a.builtIn ? -1 : 1;
      return a.createdAt - b.createdAt;
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
    grants: grants.filter((g) => g.adminId === adminId).sort((a, b) => b.grantedAt - a.grantedAt),
    overlays: overlays.filter((o) => o.adminId === adminId).sort((a, b) => b.grantedAt - a.grantedAt),
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
  const roleById = new Map(roles.map((r) => [r.id, r]));
  const mine = grants.filter((g) => g.adminId === adminId);
  const active = mine.filter((g) => roleExpiryStatus(g.expiresAt) !== "expired");
  const result = emptyPermissions();
  const activeRoleIds: string[] = [];
  active.forEach((g) => {
    const role = roleById.get(g.roleId);
    if (!role) return;
    activeRoleIds.push(g.roleId);
    const perms =
      role.tier === "superadmin" ? fullPermissions() : (permissions[g.roleId] ?? emptyPermissions());
    MODULE_IDS.forEach((id) => {
      if (perms[id].view) result[id].view = true;
      if (perms[id].edit) {
        result[id].view = true;
        result[id].edit = true;
      }
    });
  });
  overlays
    .filter((o) => o.adminId === adminId)
    .forEach((o) => {
      result[o.moduleId].view = true;
      if (o.action === "edit") result[o.moduleId].edit = true;
    });
  return { permissions: result, activeRoleIds, expiredGrantCount: mine.length - active.length };
}
