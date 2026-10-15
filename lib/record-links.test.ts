import {
  dbDateTimeToEpoch,
  isHttpRoute,
  parseIdList,
  recordHref,
  referenceKind,
  tableRecordKind,
  targetRecordKind,
} from "./record-links";

describe("record links", () => {
  it("maps tables and target types to linkable record kinds", () => {
    expect(tableRecordKind("admin_accounts")).toBe("adminAccount");
    expect(tableRecordKind("admin_invitations")).toBe("invitation");
    expect(tableRecordKind("notification_templates")).toBe("template");
    expect(tableRecordKind("orders")).toBeNull();
    expect(targetRecordKind("USERS")).toBe("adminAccount");
    expect(targetRecordKind("ROLES")).toBe("role");
    expect(targetRecordKind("NOTIFICATION_ALERT_ROUTES")).toBe("alertRoute");
    expect(targetRecordKind("CITIES")).toBeNull();
    expect(targetRecordKind(null)).toBeNull();
  });

  it("builds the deep link for each kind", () => {
    expect(recordHref("adminAccount", "u 1")).toBe("/admin/user-management?open=u%201");
    expect(recordHref("invitation", "inv-1")).toBe("/admin/user-management?invite=inv-1");
    expect(recordHref("role", 9)).toBe("/admin/roles/9");
    expect(recordHref("template", 1)).toBe("/admin/notifications/templates?open=1");
    expect(recordHref("alertRoute", 7)).toBe("/admin/notifications/routing?open=7");
    expect(recordHref("actionLog", "34")).toBe("/admin/audit/actions?open=34");
    expect(recordHref("securityPolicy", "16")).toBe("/admin/settings/security");
  });

  it("classifies reference keys, including nested payload paths", () => {
    expect(referenceKind("invited_by_admin_id")).toBe("admin");
    expect(referenceKind("granted_by_admin_id")).toBe("admin");
    expect(referenceKind("admin_account_id")).toBe("admin");
    expect(referenceKind("audience_filter.user_ids")).toBe("adminList");
    expect(referenceKind("proposed_role_ids")).toBe("roles");
    expect(referenceKind("audience_filter.role_ids")).toBe("roles");
    expect(referenceKind("template_id")).toBe("template");
    expect(referenceKind("alert_route_id")).toBe("alertRoute");
    expect(referenceKind("channel_id")).toBe("channel");
    expect(referenceKind("staff_id")).toBeNull();
    expect(referenceKind("permission_ids")).toBeNull();
  });

  it("detects raw HTTP route summaries", () => {
    expect(isHttpRoute("PUT roles/9/permissions")).toBe(true);
    expect(isHttpRoute("DELETE notification-alert-routes/7")).toBe(true);
    expect(isHttpRoute("Demo admin action log row for local audit UI/testing.")).toBe(false);
    expect(isHttpRoute(null)).toBe(false);
  });

  it("parses id lists from JSON strings and plain values", () => {
    expect(parseIdList("[3,1,4,2]")).toEqual(["3", "1", "4", "2"]);
    expect(parseIdList("[]")).toEqual([]);
    expect(parseIdList("3, 7")).toEqual(["3", "7"]);
    expect(parseIdList("5")).toEqual(["5"]);
  });

  it("reads DB datetimes as UTC and ignores other strings", () => {
    expect(dbDateTimeToEpoch("2026-09-23 14:26:32")).toBe(Date.UTC(2026, 8, 23, 14, 26, 32));
    expect(dbDateTimeToEpoch("2026-09-23T14:26:32.000000Z")).toBe(Date.UTC(2026, 8, 23, 14, 26, 32));
    expect(dbDateTimeToEpoch("PENDING")).toBeNull();
    expect(dbDateTimeToEpoch("2026-09-23")).toBeNull();
  });
});
