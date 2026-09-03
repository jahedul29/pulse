import { useRbacStore } from "./store";
import { seedRoles, seedPermissions, seedGrants, seedOverlays } from "./mock";
import { countGranted, permissionsFrom } from "./modules";

const store = () => useRbacStore.getState();

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
    const id = store().createRole({ name: "QA Reviewer", description: "d", by: "Me" });
    const role = store().roles.find((candidate) => candidate.id === id);
    expect(role).toMatchObject({ name: "QA Reviewer", builtIn: false, createdBy: "Me" });
    expect(countGranted(store().permissions[id])).toEqual({ view: 0, edit: 0 });
  });

  it("updateRole edits a custom role but ignores built-in roles", () => {
    store().updateRole("role-refund", { name: "Renamed", description: "z" });
    expect(store().roles.find((role) => role.id === "role-refund")?.name).toBe("Renamed");

    store().updateRole("role-superadmin", { name: "Hacked", description: "x" });
    expect(store().roles.find((role) => role.id === "role-superadmin")?.name).toBe("Superadmin");
  });

  it("deleteRole is a no-op for built-in roles", () => {
    const before = store().roles.length;
    store().deleteRole("role-admin");
    expect(store().roles.length).toBe(before);
    expect(store().roles.find((role) => role.id === "role-admin")).toBeDefined();
  });

  it("deleteRole removes a custom role, its permissions, and its grants", () => {
    expect(store().grants.some((grant) => grant.roleId === "role-refund")).toBe(true);
    store().deleteRole("role-refund");
    expect(store().roles.find((role) => role.id === "role-refund")).toBeUndefined();
    expect(store().permissions["role-refund"]).toBeUndefined();
    expect(store().grants.some((grant) => grant.roleId === "role-refund")).toBe(false);
  });

  it("addGrant then revokeGrant", () => {
    const before = store().grants.length;
    store().addGrant({ adminId: "ad-1", roleId: "role-cco", expiresAt: null, by: "Me" });
    expect(store().grants.length).toBe(before + 1);
    const grant = store().grants.find((x) => x.adminId === "ad-1" && x.roleId === "role-cco");
    expect(grant).toBeDefined();
    store().revokeGrant(grant?.id ?? "");
    expect(store().grants.find((x) => x.id === (grant?.id ?? ""))).toBeUndefined();
  });

  it("addOverlay then removeOverlay", () => {
    const before = store().overlays.length;
    store().addOverlay({ adminId: "ad-1", moduleId: "orders", action: "edit", by: "Me" });
    expect(store().overlays.length).toBe(before + 1);
    const overlay = store().overlays.find((x) => x.adminId === "ad-1" && x.moduleId === "orders");
    expect(overlay).toBeDefined();
    store().removeOverlay(overlay?.id ?? "");
    expect(store().overlays.find((x) => x.id === (overlay?.id ?? ""))).toBeUndefined();
  });

  it("setPermissions replaces a role's permission map", () => {
    const next = permissionsFrom(["dashboard"], ["orders"]);
    store().setPermissions("role-cco", next);
    expect(store().permissions["role-cco"]).toEqual(next);
  });

  it("setPermissions is a no-op for the superadmin role", () => {
    const before = store().permissions["role-superadmin"];
    store().setPermissions("role-superadmin", permissionsFrom([]));
    expect(store().permissions["role-superadmin"]).toBe(before);
  });
});
