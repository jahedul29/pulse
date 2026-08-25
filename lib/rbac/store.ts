import { create } from "zustand";
import { emptyPermissions } from "./modules";
import { seedRoles, seedPermissions, seedGrants, seedOverlays } from "./mock";
import type {
  Role,
  RoleGrant,
  PermissionOverlay,
  RolePermissions,
  ModuleId,
  PermissionAction,
} from "./types";

let seq = 0;
function uid(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${seq++}`;
}

interface RbacState {
  roles: Role[];
  permissions: Record<string, RolePermissions>;
  grants: RoleGrant[];
  overlays: PermissionOverlay[];
  createRole: (input: { name: string; description: string; by: string }) => string;
  updateRole: (id: string, patch: { name: string; description: string }) => void;
  deleteRole: (id: string) => void;
  setPermissions: (roleId: string, permissions: RolePermissions) => void;
  addGrant: (input: { adminId: string; roleId: string; expiresAt: number | null; by: string }) => void;
  revokeGrant: (id: string) => void;
  addOverlay: (input: { adminId: string; moduleId: ModuleId; action: PermissionAction; by: string }) => void;
  removeOverlay: (id: string) => void;
}

export const useRbacStore = create<RbacState>((set) => ({
  roles: seedRoles(),
  permissions: seedPermissions(),
  grants: seedGrants(),
  overlays: seedOverlays(),

  createRole: ({ name, description, by }) => {
    const id = uid("role");
    set((s) => ({
      roles: [
        ...s.roles,
        { id, name, description, builtIn: false, tier: null, createdBy: by, createdAt: Date.now() },
      ],
      permissions: { ...s.permissions, [id]: emptyPermissions() },
    }));
    return id;
  },

  updateRole: (id, patch) =>
    set((s) => ({
      roles: s.roles.map((r) => (r.id === id && !r.builtIn ? { ...r, ...patch } : r)),
    })),

  deleteRole: (id) =>
    set((s) => {
      const role = s.roles.find((r) => r.id === id);
      if (!role || role.builtIn) return s;
      const permissions = { ...s.permissions };
      delete permissions[id];
      return {
        roles: s.roles.filter((r) => r.id !== id),
        permissions,
        grants: s.grants.filter((g) => g.roleId !== id),
      };
    }),

  setPermissions: (roleId, permissions) =>
    set((s) => {
      const role = s.roles.find((r) => r.id === roleId);
      if (role?.tier === "superadmin") return s;
      return { permissions: { ...s.permissions, [roleId]: permissions } };
    }),

  addGrant: ({ adminId, roleId, expiresAt, by }) =>
    set((s) => ({
      grants: [
        ...s.grants,
        { id: uid("grant"), adminId, roleId, expiresAt, grantedBy: by, grantedAt: Date.now() },
      ],
    })),

  revokeGrant: (id) => set((s) => ({ grants: s.grants.filter((g) => g.id !== id) })),

  addOverlay: ({ adminId, moduleId, action, by }) =>
    set((s) => ({
      overlays: [
        ...s.overlays,
        { id: uid("ov"), adminId, moduleId, action, grantedBy: by, grantedAt: Date.now() },
      ],
    })),

  removeOverlay: (id) => set((s) => ({ overlays: s.overlays.filter((o) => o.id !== id) })),
}));
