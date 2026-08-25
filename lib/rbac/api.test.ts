import { roleExpiryStatus, effectivePermissions } from "./api";
import { useRbacStore } from "./store";
import { permissionsFrom, emptyPermissions, countGranted, MODULE_IDS } from "./modules";
import type { Role, RoleGrant, PermissionOverlay } from "./types";

const DAY = 86_400_000;

function role(id: string, tier: Role["tier"] = null): Role {
  return { id, name: id, description: "", builtIn: tier != null, tier, createdBy: "seed", createdAt: 0 };
}
function grant(id: string, adminId: string, roleId: string, expiresAt: number | null): RoleGrant {
  return { id, adminId, roleId, expiresAt, grantedBy: "x", grantedAt: 0 };
}
function overlay(id: string, adminId: string): PermissionOverlay {
  return { id, adminId, moduleId: "notifications", action: "view", grantedBy: "x", grantedAt: 0 };
}

describe("roleExpiryStatus", () => {
  it("treats a null expiry as permanent", () => {
    expect(roleExpiryStatus(null)).toBe("permanent");
  });

  it("flags a past expiry as expired", () => {
    expect(roleExpiryStatus(Date.now() - DAY)).toBe("expired");
  });

  it("flags an expiry within seven days as soon", () => {
    expect(roleExpiryStatus(Date.now() + 3 * DAY)).toBe("soon");
  });

  it("treats an expiry beyond seven days as active", () => {
    expect(roleExpiryStatus(Date.now() + 30 * DAY)).toBe("active");
  });
});

describe("effectivePermissions", () => {
  it("unions active grants + overlays and excludes expired grants", async () => {
    useRbacStore.setState({
      roles: [role("r-active"), role("r-expired")],
      permissions: {
        "r-active": permissionsFrom(["clients"], ["clients"]),
        "r-expired": permissionsFrom(["financial"], ["financial"]),
      },
      grants: [
        grant("g1", "a1", "r-active", Date.now() + 30 * DAY),
        grant("g2", "a1", "r-expired", Date.now() - DAY),
      ],
      overlays: [overlay("o1", "a1")],
    });

    const eff = await effectivePermissions("a1");
    expect(eff.permissions.clients).toEqual({ view: true, edit: true });
    expect(eff.permissions.financial).toEqual({ view: false, edit: false });
    expect(eff.permissions.notifications).toEqual({ view: true, edit: false });
    expect(eff.activeRoleIds).toEqual(["r-active"]);
    expect(eff.expiredGrantCount).toBe(1);
  });

  it("grants full access for a superadmin role regardless of stored permissions", async () => {
    useRbacStore.setState({
      roles: [role("r-sa", "superadmin")],
      permissions: { "r-sa": emptyPermissions() },
      grants: [grant("g", "a2", "r-sa", null)],
      overlays: [],
    });

    const eff = await effectivePermissions("a2");
    const counts = countGranted(eff.permissions);
    expect(counts.view).toBe(MODULE_IDS.length);
    expect(counts.edit).toBe(MODULE_IDS.length);
  });
});
