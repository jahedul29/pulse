import { useRbacStore } from "./store";
import { seedRoles, seedPermissions, seedGrants, seedOverlays } from "./mock";
import { countGranted, permissionsFrom } from "./modules";

const s = () => useRbacStore.getState();

beforeEach(() => {
  useRbacStore.setState({
    roles: seedRoles(),
    permissions: seedPermissions(),
    grants: seedGrants(),
    overlays: seedOverlays(),
  });
});

describe("useRbacStore", () => {
  it("createRole adds a custom role seeded with empty permissions", () => {
    const id = s().createRole({ name: "QA Reviewer", description: "d", by: "Me" });
    const role = s().roles.find((r) => r.id === id);
    expect(role).toMatchObject({ name: "QA Reviewer", builtIn: false, createdBy: "Me" });
    expect(countGranted(s().permissions[id])).toEqual({ view: 0, edit: 0 });
  });

  it("updateRole edits a custom role but ignores built-in roles", () => {
    s().updateRole("role-refund", { name: "Renamed", description: "z" });
    expect(s().roles.find((r) => r.id === "role-refund")?.name).toBe("Renamed");

    s().updateRole("role-superadmin", { name: "Hacked", description: "x" });
    expect(s().roles.find((r) => r.id === "role-superadmin")?.name).toBe("Superadmin");
  });

  it("deleteRole is a no-op for built-in roles", () => {
    const before = s().roles.length;
    s().deleteRole("role-admin");
    expect(s().roles.length).toBe(before);
    expect(s().roles.find((r) => r.id === "role-admin")).toBeDefined();
  });

  it("deleteRole removes a custom role, its permissions, and its grants", () => {
    expect(s().grants.some((g) => g.roleId === "role-refund")).toBe(true);
    s().deleteRole("role-refund");
    expect(s().roles.find((r) => r.id === "role-refund")).toBeUndefined();
    expect(s().permissions["role-refund"]).toBeUndefined();
    expect(s().grants.some((g) => g.roleId === "role-refund")).toBe(false);
  });

  it("addGrant then revokeGrant", () => {
    const before = s().grants.length;
    s().addGrant({ adminId: "ad-1", roleId: "role-cco", expiresAt: null, by: "Me" });
    expect(s().grants.length).toBe(before + 1);
    const g = s().grants.find((x) => x.adminId === "ad-1" && x.roleId === "role-cco");
    expect(g).toBeDefined();
    s().revokeGrant(g?.id ?? "");
    expect(s().grants.find((x) => x.id === (g?.id ?? ""))).toBeUndefined();
  });

  it("addOverlay then removeOverlay", () => {
    const before = s().overlays.length;
    s().addOverlay({ adminId: "ad-1", moduleId: "orders", action: "edit", by: "Me" });
    expect(s().overlays.length).toBe(before + 1);
    const o = s().overlays.find((x) => x.adminId === "ad-1" && x.moduleId === "orders");
    expect(o).toBeDefined();
    s().removeOverlay(o?.id ?? "");
    expect(s().overlays.find((x) => x.id === (o?.id ?? ""))).toBeUndefined();
  });

  it("setPermissions replaces a role's permission map", () => {
    const next = permissionsFrom(["dashboard"], ["orders"]);
    s().setPermissions("role-cco", next);
    expect(s().permissions["role-cco"]).toEqual(next);
  });

  it("setPermissions is a no-op for the superadmin role", () => {
    const before = s().permissions["role-superadmin"];
    s().setPermissions("role-superadmin", permissionsFrom([]));
    expect(s().permissions["role-superadmin"]).toBe(before);
  });
});
