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
    set((state) => ({
      roles: [
        ...state.roles,
        { id, name, description, builtIn: false, tier: null, createdBy: by, createdAt: Date.now() },
      ],
      permissions: { ...state.permissions, [id]: emptyPermissions() },
    }));
    return id;
  },

  updateRole: (id, patch) =>
    set((state) => ({
      roles: state.roles.map((role) => (role.id === id && !role.builtIn ? { ...role, ...patch } : role)),
    })),

  deleteRole: (id) =>
    set((state) => {
      const role = state.roles.find((candidate) => candidate.id === id);
      if (!role || role.builtIn) return state;
      const permissions = { ...state.permissions };
      delete permissions[id];
      return {
        roles: state.roles.filter((candidate) => candidate.id !== id),
        permissions,
        grants: state.grants.filter((grant) => grant.roleId !== id),
      };
    }),

  setPermissions: (roleId, permissions) =>
    set((state) => {
      const role = state.roles.find((candidate) => candidate.id === roleId);
      if (role?.tier === "superadmin") return state;
      return { permissions: { ...state.permissions, [roleId]: permissions } };
    }),

  addGrant: ({ adminId, roleId, expiresAt, by }) =>
    set((state) => ({
      grants: [
        ...state.grants,
        { id: uid("grant"), adminId, roleId, expiresAt, grantedBy: by, grantedAt: Date.now() },
      ],
    })),

  revokeGrant: (id) => set((state) => ({ grants: state.grants.filter((grant) => grant.id !== id) })),

  addOverlay: ({ adminId, moduleId, action, by }) =>
    set((state) => ({
      overlays: [
        ...state.overlays,
        { id: uid("ov"), adminId, moduleId, action, grantedBy: by, grantedAt: Date.now() },
      ],
    })),

  removeOverlay: (id) =>
    set((state) => ({ overlays: state.overlays.filter((overlay) => overlay.id !== id) })),
}));
