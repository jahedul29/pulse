import { PERMISSIONS, sessionHasPermission } from "./permissions";

describe("sessionHasPermission", () => {
  it("uses the permission codes returned at login", () => {
    const session = { role: "admin", permissions: ["USER_MANAGEMENT.user_management.EDIT", "ROLES.roles.VIEW"] };
    expect(sessionHasPermission(session, PERMISSIONS.USER_MANAGEMENT_EDIT)).toBe(true);
    expect(sessionHasPermission(session, PERMISSIONS.ROLES_EDIT)).toBe(false);
    expect(sessionHasPermission(session, PERMISSIONS.INVITATIONS_EDIT)).toBe(false);
  });

  it("trusts the login list over the role name, even for superadmin", () => {
    expect(sessionHasPermission({ role: "superadmin", permissions: [] }, PERMISSIONS.ROLES_EDIT)).toBe(false);
  });

  it("falls back to the role for sessions saved before permissions were stored", () => {
    expect(sessionHasPermission({ role: "superadmin" }, PERMISSIONS.SECURITY_POLICY_EDIT)).toBe(true);
    expect(sessionHasPermission({ role: "Owner" }, PERMISSIONS.ALERT_ROUTES_EDIT)).toBe(true);
    expect(sessionHasPermission({ role: "admin" }, PERMISSIONS.USER_MANAGEMENT_EDIT)).toBe(false);
  });

  it("denies everything without a session", () => {
    expect(sessionHasPermission(null, PERMISSIONS.USER_MANAGEMENT_EDIT)).toBe(false);
  });

  it("uses the real backend permission codes", () => {
    expect(Object.values(PERMISSIONS)).toEqual([
      "USER_MANAGEMENT.user_management.EDIT",
      "USER_MANAGEMENT.invitations.EDIT",
      "ROLES.roles.EDIT",
      "ROLES.security_policy.EDIT",
      "NOTIFICATIONS.notification_templates.EDIT",
      "NOTIFICATIONS.alert_routes.EDIT",
    ]);
  });
});
