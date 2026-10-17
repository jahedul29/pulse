import { ADMIN_ACTION_LOGS_PATH, CHANGE_LOGS_PATH, LOGIN_AUDIT_LOGS_PATH } from "@/lib/api/audit-paths";
import {
  accessState,
  canAccessPath,
  firstAccessiblePath,
  hasPendingAccess,
  hasRouteRule,
  landingPath,
  PROBE_ENDPOINTS,
  START_PAGES,
} from "./access";
import { PERMISSIONS } from "./permissions";

function session(...permissions: string[]) {
  return { role: "admin", permissions };
}

describe("canAccessPath", () => {
  it("allows a page when the user has its view permission", () => {
    expect(canAccessPath(session(PERMISSIONS.ROLES_VIEW), "/admin/roles")).toBe(true);
    expect(canAccessPath(session(), "/admin/roles")).toBe(false);
    expect(canAccessPath(session(PERMISSIONS.ROLES_EDIT), "/admin/roles")).toBe(false);
  });

  it("needs both the role and the permission catalogue for the permission matrix", () => {
    expect(canAccessPath(session(PERMISSIONS.ROLES_VIEW), "/admin/roles/4")).toBe(false);
    expect(canAccessPath(session(PERMISSIONS.ROLES_VIEW, PERMISSIONS.PERMISSIONS_VIEW), "/admin/roles/4")).toBe(true);
  });

  it("opens User accounts with either the accounts or the invitations permission", () => {
    expect(canAccessPath(session(PERMISSIONS.INVITATIONS_VIEW), "/admin/user-management")).toBe(true);
    expect(canAccessPath(session(PERMISSIONS.USER_MANAGEMENT_VIEW), "/admin/user-management?open=u-1")).toBe(true);
    expect(canAccessPath(session(PERMISSIONS.ROLES_VIEW), "/admin/user-management")).toBe(false);
  });

  it("covers every Locations page with the technical permission", () => {
    for (const path of ["/admin/locations/builder?region=3", "/admin/locations/regions", "/admin/locations/countries"]) {
      expect(canAccessPath(session(PERMISSIONS.TECHNICAL_VIEW), path)).toBe(true);
      expect(canAccessPath(session(), path)).toBe(false);
    }
  });

  it("leaves unmapped pages such as own sessions open", () => {
    expect(canAccessPath(session(), "/admin/settings/sessions")).toBe(true);
  });

  it("decides the audit logs from the backend's answer to a probe request", () => {
    expect(PROBE_ENDPOINTS).toEqual([ADMIN_ACTION_LOGS_PATH, CHANGE_LOGS_PATH, LOGIN_AUDIT_LOGS_PATH]);
    expect(accessState(session(), "/admin/audit/actions")).toBe("unknown");
    expect(accessState(session(), "/admin/audit/actions", { [ADMIN_ACTION_LOGS_PATH]: false })).toBe("denied");
    expect(accessState(session(), "/admin/audit/changes?action=4", { [CHANGE_LOGS_PATH]: true })).toBe("allowed");
    expect(canAccessPath(session(), "/admin/audit/logins")).toBe(false);
  });

  it("denies mapped pages without a session", () => {
    expect(canAccessPath(null, "/admin/roles")).toBe(false);
  });
});

describe("firstAccessiblePath", () => {
  it("returns the first start page the user can open, in sidebar order", () => {
    expect(firstAccessiblePath(session(PERMISSIONS.NOTIFICATION_TEMPLATES_VIEW, PERMISSIONS.ROLES_VIEW))).toBe("/admin/roles");
    expect(firstAccessiblePath(session(PERMISSIONS.SPECIALISTS_VIEW))).toBe("/personnel");
  });
});

describe("landingPath", () => {
  const roles = session(PERMISSIONS.ROLES_VIEW);

  it("goes back to the requested page when the user may open it", () => {
    expect(landingPath(roles, { returnTo: "/admin/roles?page=2" })).toBe("/admin/roles?page=2");
  });

  it("skips a returned page the user can't open, then the backend landing page, then the first allowed page", () => {
    expect(landingPath(roles, { returnTo: "/admin/settings/security", landingPage: "/admin/roles" })).toBe("/admin/roles");
    expect(landingPath(roles, { returnTo: "/admin/settings/security", landingPage: "/clients" })).toBe("/admin/roles");
  });

  it("ignores unsafe redirect targets", () => {
    expect(landingPath(roles, { returnTo: "//evil.example/admin/roles" })).toBe("/admin/roles");
    expect(landingPath(roles, { returnTo: "https://evil.example" })).toBe("/admin/roles");
  });

  it("lands on a probed audit page only once the probe allows it", () => {
    expect(landingPath(session(), {})).toBe(START_PAGES[0]);
    expect(landingPath(session(), {}, { [ADMIN_ACTION_LOGS_PATH]: true })).toBe("/admin/audit/actions");
    expect(landingPath(session(), { returnTo: "/admin/audit/changes" })).toBe("/admin/audit/changes");
    expect(landingPath(session(), { returnTo: "/admin/audit/changes" }, { [CHANGE_LOGS_PATH]: false })).toBe(START_PAGES[0]);
  });
});

describe("landing page from the backend", () => {
  const roles = session(PERMISSIONS.ROLES_VIEW);

  it("accepts only routes the app knows", () => {
    expect(landingPath(roles, { landingPage: "/admin/roles" })).toBe("/admin/roles");
    expect(landingPath(roles, { landingPage: "/dashboard" })).toBe("/admin/roles");
  });

  it("rejects control-character and dot-segment tricks in the requested page", () => {
    for (const returnTo of ["/\t/evil.example", "/..//evil.example", "/.//evil.example", "/%2e%2e//evil.example", "/admin/..//evil.example"]) {
      expect(landingPath(roles, { returnTo })).toBe("/admin/roles");
    }
  });
});

describe("pending and rule helpers", () => {
  it("reports pending access while a probed page is still unknown", () => {
    expect(hasPendingAccess(session())).toBe(true);
    expect(
      hasPendingAccess(session(), {
        [ADMIN_ACTION_LOGS_PATH]: false,
        [CHANGE_LOGS_PATH]: false,
        [LOGIN_AUDIT_LOGS_PATH]: true,
      }),
    ).toBe(false);
  });

  it("knows which routes have an access rule", () => {
    expect(hasRouteRule("/admin/roles")).toBe(true);
    expect(hasRouteRule("/admin/settings/sessions")).toBe(false);
  });
});

describe("record deep links", () => {
  it("needs the accounts permission for an account and the invitations permission for an invitation", () => {
    const invitationsOnly = session(PERMISSIONS.INVITATIONS_VIEW);
    expect(canAccessPath(invitationsOnly, "/admin/user-management?invite=i-1")).toBe(true);
    expect(canAccessPath(invitationsOnly, "/admin/user-management?open=u-1")).toBe(false);
    const accountsOnly = session(PERMISSIONS.USER_MANAGEMENT_VIEW);
    expect(canAccessPath(accountsOnly, "/admin/user-management?open=u-1")).toBe(true);
    expect(canAccessPath(accountsOnly, "/admin/user-management?invite=i-1")).toBe(false);
  });
});
