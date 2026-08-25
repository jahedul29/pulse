import { fullPermissions, permissionsFrom } from "./modules";
import type { Role, RoleGrant, PermissionOverlay, RolePermissions } from "./types";

const DAY = 86_400_000;
const OWNER = "Sam Al-Rashid";

export function seedRoles(): Role[] {
  const now = Date.now();
  return [
    {
      id: "role-superadmin",
      name: "Superadmin",
      description: "Unrestricted access. Manages roles, billing and every account.",
      builtIn: true,
      tier: "superadmin",
      createdBy: "System",
      createdAt: now - 400 * DAY,
    },
    {
      id: "role-admin",
      name: "Admin",
      description: "Runs day-to-day operations and oversees agents. Cannot edit user privileges.",
      builtIn: true,
      tier: "admin",
      createdBy: "System",
      createdAt: now - 400 * DAY,
    },
    {
      id: "role-supervisor",
      name: "Supervisor",
      description: "Leads a support team and edits client, specialist and order records.",
      builtIn: true,
      tier: "supervisor",
      createdBy: "System",
      createdAt: now - 400 * DAY,
    },
    {
      id: "role-cco",
      name: "Call center operator",
      description: "Handles inbound support. Mostly read access across the platform.",
      builtIn: true,
      tier: "call_center_operator",
      createdBy: "System",
      createdAt: now - 400 * DAY,
    },
    {
      id: "role-refund",
      name: "Refund supervisor",
      description: "Temporary role for covering refund approvals during leave.",
      builtIn: false,
      tier: null,
      createdBy: OWNER,
      createdAt: now - 12 * DAY,
    },
    {
      id: "role-content",
      name: "Content editor",
      description: "Manages banners, policies and push notifications.",
      builtIn: false,
      tier: null,
      createdBy: "Dana Okonkwo",
      createdAt: now - 40 * DAY,
    },
  ];
}

export function seedPermissions(): Record<string, RolePermissions> {
  const admin = fullPermissions();
  admin.userManagement.edit = false;

  return {
    "role-superadmin": fullPermissions(),
    "role-admin": admin,
    "role-supervisor": permissionsFrom(
      ["dashboard", "events", "technical", "clients", "specialists", "orders", "notifications", "services"],
      ["clients", "specialists", "orders", "events", "discounts"],
    ),
    "role-cco": permissionsFrom(
      ["dashboard", "clients", "specialists", "orders", "events", "notifications", "services"],
      ["clients"],
    ),
    "role-refund": permissionsFrom(["dashboard", "clients", "orders", "financial"], ["orders", "financial"]),
    "role-content": permissionsFrom(["dashboard", "content", "notifications", "services"], ["content", "notifications"]),
  };
}

export function seedGrants(): RoleGrant[] {
  const now = Date.now();
  return [
    { id: "grant-1", adminId: "ad-2", roleId: "role-superadmin", expiresAt: null, grantedBy: "System", grantedAt: now - 400 * DAY },
    { id: "grant-2", adminId: "ad-1", roleId: "role-admin", expiresAt: null, grantedBy: OWNER, grantedAt: now - 180 * DAY },
    { id: "grant-3", adminId: "ad-3", roleId: "role-supervisor", expiresAt: null, grantedBy: OWNER, grantedAt: now - 90 * DAY },
    { id: "grant-4", adminId: "ad-4", roleId: "role-cco", expiresAt: null, grantedBy: "Dana Okonkwo", grantedAt: now - 60 * DAY },
    { id: "grant-5", adminId: "ad-4", roleId: "role-refund", expiresAt: now + 30 * DAY, grantedBy: OWNER, grantedAt: now - 3 * DAY },
  ];
}

export function seedOverlays(): PermissionOverlay[] {
  const now = Date.now();
  return [
    { id: "ov-1", adminId: "ad-4", moduleId: "clientsReferral", action: "view", grantedBy: OWNER, grantedAt: now - 2 * DAY },
  ];
}
