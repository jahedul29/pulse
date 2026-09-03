import {
  MODULE_IDS,
  MODULES,
  emptyPermissions,
  fullPermissions,
  permissionsFrom,
  countGranted,
} from "./modules";

describe("rbac module helpers", () => {
  it("defines exactly 15 portal modules", () => {
    expect(MODULE_IDS).toHaveLength(15);
    expect(MODULES).toHaveLength(15);
  });

  it("emptyPermissions grants nothing", () => {
    const permissions = emptyPermissions();
    expect(countGranted(permissions)).toEqual({ view: 0, edit: 0 });
    expect(permissions.dashboard).toEqual({ view: false, edit: false });
  });

  it("fullPermissions grants view + edit on every module", () => {
    expect(countGranted(fullPermissions())).toEqual({ view: 15, edit: 15 });
  });

  it("permissionsFrom makes edit imply view", () => {
    const permissions = permissionsFrom(["dashboard"], ["orders"]);
    expect(permissions.dashboard).toEqual({ view: true, edit: false });
    expect(permissions.orders).toEqual({ view: true, edit: true });
    expect(countGranted(permissions)).toEqual({ view: 2, edit: 1 });
  });
});
