import {
  actionDtoToDetail,
  actionDtoToRow,
  changeDtoToDetail,
  changeDtoToRow,
  flattenPayload,
  humanizeCode,
  payloadName,
  type AdminActionLogDto,
  type ChangeLogDto,
} from "./dto";

describe("actionDtoToRow", () => {
  const dto: AdminActionLogDto = {
    id: "A-1",
    admin_account_id: "ad-1",
    admin_account: { email: "dana@abapro.health", staff: { first_name: "Dana", last_name: "Okonkwo" } },
    action_code: "user.suspend",
    target_type: "User",
    target_id: "42",
    target_summary: "Suspended Yuki Tanaka",
    result: "success",
    severity: "warning",
    correlation_id: "corr-1",
    user_agent: "Mozilla/5.0 (Macintosh) Chrome/152",
    created_at: "2026-09-10T10:00:00Z",
  };

  it("maps action_code/target fields verbatim and names from staff", () => {
    const row = actionDtoToRow(dto);
    expect(row.actionName).toBe("user.suspend");
    expect(row.summary).toBe("Suspended Yuki Tanaka");
    expect(row.entity).toBe("User · 42");
    expect(row.targetType).toBe("User");
    expect(row.targetId).toBe("42");
    expect(row.correlationId).toBe("corr-1");
    expect(row.adminEmail).toBe("dana@abapro.health");
    expect(row.device).toBe("Chrome · macOS");
    expect(row.actorName).toBe("Dana Okonkwo");
    expect(row.result).toBe("success");
    expect(row.severity).toBe("warning");
  });

  it("maps target_user to a display name, preferring full_name, then real_name, then email", () => {
    const targetUser = {
      id: "u-5",
      full_name: "Test Administrator",
      real_name: "Real Name",
      username: "SUID-0005",
      email: "administrator@ababro.ai",
    };
    expect(actionDtoToRow({ ...dto, target_user: targetUser }).targetUser).toEqual({
      id: "u-5",
      name: "Test Administrator",
      username: "SUID-0005",
      email: "administrator@ababro.ai",
    });
    expect(actionDtoToRow({ ...dto, target_user: { ...targetUser, full_name: " " } }).targetUser?.name).toBe(
      "Real Name",
    );
    expect(
      actionDtoToRow({ ...dto, target_user: { email: "only@ababro.ai", full_name: null, real_name: null } })
        .targetUser,
    ).toEqual({ name: "only@ababro.ai", username: undefined, email: "only@ababro.ai" });
  });

  it("returns a null target user when absent or nameless", () => {
    expect(actionDtoToRow(dto).targetUser).toBeNull();
    expect(actionDtoToRow({ ...dto, target_user: null }).targetUser).toBeNull();
    expect(actionDtoToRow({ ...dto, target_user: { id: "u-9", username: "SUID-0009" } }).targetUser).toBeNull();
  });

  it("maps permission_names and role_names, dropping blanks and defaulting to empty", () => {
    const row = actionDtoToRow({
      ...dto,
      permission_names: ["Manage Dashboard module.", "", "View Dashboard module."],
      role_names: ["Administrator"],
    });
    expect(row.permissionNames).toEqual(["Manage Dashboard module.", "View Dashboard module."]);
    expect(row.roleNames).toEqual(["Administrator"]);
    expect(actionDtoToRow(dto).permissionNames).toEqual([]);
    expect(actionDtoToRow({ ...dto, role_names: null }).roleNames).toEqual([]);
  });

  it("falls back to System when no admin account", () => {
    expect(actionDtoToRow({ ...dto, admin_account: null }).actorName).toBe("System");
  });

  it("prefers action_label over action_code, falling back to code", () => {
    expect(actionDtoToRow({ ...dto, action_label: "Suspended a user" }).actionName).toBe(
      "Suspended a user",
    );
    expect(actionDtoToRow({ ...dto, action_label: null }).actionName).toBe("user.suspend");
  });
});

describe("flattenPayload (deep, dotted labels, masked)", () => {
  it("counts long lists of objects instead of listing every entry", () => {
    const points = Array.from({ length: 26 }, () => ({ mgrs: "39Q WG 71500 53500" }));
    expect(flattenPayload({ points })).toEqual([{ key: "points.count", label: "Points · Count", value: "26" }]);
    expect(flattenPayload({ points: points.slice(0, 2) })).toHaveLength(2);
  });

  it("flattens nested objects to dotted leaf rows", () => {
    const inputs = flattenPayload({
      body: { EN: "Welcome to ABAPRO Admin" },
      code: "WELCOME",
      subject: { EN: "Welcome" },
      is_active: true,
      channel_id: 1,
    });
    const map = Object.fromEntries(inputs.map((input) => [input.label, input.value]));
    expect(map["Body · EN"]).toBe("Welcome to ABAPRO Admin");
    expect(map["Code"]).toBe("WELCOME");
    expect(map["Subject · EN"]).toBe("Welcome");
    expect(map["Is active"]).toBe("true");
    expect(map["Channel ID"]).toBe("1");
  });

  it("handles a flat primitive payload with a humanized label", () => {
    expect(flattenPayload({ seed: true })).toEqual([{ key: "seed", label: "Seed", value: "true" }]);
  });

  it("joins an array of primitives into one humanized row", () => {
    expect(flattenPayload({ permission_ids: [1, 4, 3, 6, 5, 70] })).toEqual([
      { key: "permission_ids", label: "Permission IDs", value: "1, 4, 3, 6, 5, 70" },
    ]);
  });

  it("flattens an array of objects per index", () => {
    const inputs = flattenPayload({ items: [{ id: 1 }, { id: 2 }] });
    const map = Object.fromEntries(inputs.map((input) => [input.label, input.value]));
    expect(map["Items[0] · ID"]).toBe("1");
    expect(map["Items[1] · ID"]).toBe("2");
    expect(inputs.map((input) => input.key)).toEqual(["items[0].id", "items[1].id"]);
  });

  it("keeps the raw dotted key so ids can be resolved", () => {
    expect(flattenPayload({ audience_filter: { role_ids: [3, 1] } })).toEqual([
      { key: "audience_filter.role_ids", label: "Audience filter · Role IDs", value: "3, 1" },
    ]);
  });

  it("masks email-looking values (mask keyed on the raw field, label humanized)", () => {
    const [input] = flattenPayload({ email: "jane@acme.ae" });
    expect(input.label).toBe("Email");
    expect(input.value).not.toBe("jane@acme.ae");
  });
});

describe("actionDtoToDetail", () => {
  it("adds flattened request_payload as inputs", () => {
    const detail = actionDtoToDetail({
      id: "A-1",
      action_code: "template.create",
      result: "success",
      severity: "info",
      request_payload: { name: "Welcome message" },
    });
    expect(detail.inputs).toEqual([{ key: "name", label: "Name", value: "Welcome message" }]);
  });
});

describe("changeDtoToRow / changeDtoToDetail", () => {
  const dto: ChangeLogDto = {
    id: "C-1",
    schema_name: "admin",
    table_name: "admin_accounts",
    row_pk: "ad-9",
    operation: "update",
    admin_action_log_id: "A-1",
    actor: { staff: { first_name: "Sam", last_name: "Al-Rashid" } },
    old_data: { preferred_language: "EN" },
    new_data: { preferred_language: "AR" },
    changed_columns: ["preferred_language"],
    created_at: "2026-09-10T11:00:00Z",
  };

  it("maps table_name/row_pk/actionId, actor name, and the changed-column count for the list", () => {
    const row = changeDtoToRow(dto);
    expect(row.table).toBe("admin_accounts");
    expect(row.recordId).toBe("ad-9");
    expect(row.actionId).toBe("A-1");
    expect(row.actorName).toBe("Sam Al-Rashid");
    expect(row.schema).toBe("admin");
    expect(row.operation).toBe("update");
    expect(row.changes).toHaveLength(1);
  });

  it("carries the actor (id, username, email) and the embedded action", () => {
    const row = changeDtoToRow({
      ...dto,
      actor: { id: "u-5", full_name: "Test Administrator", username: "SUID-0005", email: "administrator@ababro.ai" },
      admin_action_log: {
        id: "34",
        action_code: "INVITATIONS_CREATE",
        action_label: "Sent an invitation",
        result: "SUCCESS",
        severity: "INFO",
        role_names: ["admin"],
      },
    });
    expect(row.actorId).toBe("u-5");
    expect(row.actorName).toBe("Test Administrator");
    expect(row.actorUsername).toBe("SUID-0005");
    expect(row.actorEmail).toBe("administrator@ababro.ai");
    expect(row.action?.actionName).toBe("Sent an invitation");
    expect(row.action?.roleNames).toEqual(["admin"]);
    expect(changeDtoToRow(dto).action).toBeNull();
    expect(changeDtoToRow({ ...dto, actor: null, actor_admin_id: "u-7" }).actorId).toBe("u-7");
  });

  it("drops BE pseudo columns from array data and the id column that repeats the record", () => {
    expect(changeDtoToDetail({ ...dto, changed_columns: ["0"], old_data: [], new_data: [] }).changes).toEqual([]);
    const inserted = changeDtoToDetail({
      ...dto,
      operation: "INSERT",
      changed_columns: null,
      old_data: null,
      new_data: { id: "ad-9", status: "PENDING" },
    });
    expect(inserted.changes).toEqual([{ column: "status", before: null, after: "PENDING" }]);
  });

  it("derives before/after per changed column", () => {
    const detail = changeDtoToDetail(dto);
    expect(detail.changes).toEqual([{ column: "preferred_language", before: "EN", after: "AR" }]);
  });

  it("falls back to old+new keys when changed_columns is absent, stringifies objects", () => {
    const detail = changeDtoToDetail({
      ...dto,
      changed_columns: null,
      old_data: { meta: { a: 1 } },
      new_data: { meta: { a: 2 } },
    });
    expect(detail.changes).toEqual([
      { column: "meta", before: '{"a":1}', after: '{"a":2}' },
    ]);
  });
});

describe("humanizeCode", () => {
  it("turns backend target-type codes into sentence-case labels", () => {
    expect(humanizeCode("NOTIFICATION_ALERT_ROUTES")).toBe("Notification alert routes");
    expect(humanizeCode("ADMIN_ACCOUNT")).toBe("Admin account");
    expect(humanizeCode("USERS")).toBe("Users");
  });

  it("returns an empty string for a missing code", () => {
    expect(humanizeCode("")).toBe("");
    expect(humanizeCode(null)).toBe("");
  });
});

describe("payloadName", () => {
  it("reads a readable name from the request payload for unresolvable targets", () => {
    expect(payloadName({ name: "Dubai", code: "DXB" })).toBe("Dubai");
    expect(payloadName({ name: { en: "Abu Dhabi", ar: "أبوظبي" }, code: "AD-01" })).toBe("Abu Dhabi");
    expect(payloadName({ name: { EN: "Welcome", AR: "مرحبا" } })).toBe("Welcome");
    expect(payloadName({ name: { AR: "مرحبا" } })).toBe("مرحبا");
    expect(payloadName({ code: "SECURITY_INCIDENT" })).toBe("SECURITY_INCIDENT");
  });

  it("returns null when the payload has nothing readable", () => {
    expect(payloadName({ staff_id: 4 })).toBeNull();
    expect(payloadName([])).toBeNull();
    expect(payloadName(null)).toBeNull();
    expect(payloadName({ name: "  " })).toBeNull();
  });
});

describe("audit extended info", () => {
  it("maps the target service with the backend label, falling back to a readable code", () => {
    const base: AdminActionLogDto = { id: "7", action_code: "ROLES_CREATE", result: "SUCCESS", severity: "INFO" };
    const labelled = actionDtoToRow({ ...base, target_service: "SELF", main: { target_service_label: "Self" } });
    expect(labelled.service).toBe("SELF");
    expect(labelled.serviceLabel).toBe("Self");
    expect(actionDtoToRow({ ...base, target_service: "USER_MANAGEMENT" }).serviceLabel).toBe("User management");
    expect(actionDtoToRow(base).serviceLabel).toBe("");
  });

  it("reads the IP hash from the extended block", () => {
    const base: AdminActionLogDto = { id: "7", action_code: "ROLES_CREATE", result: "SUCCESS", severity: "INFO" };
    expect(actionDtoToRow({ ...base, extended: { ip_hash: "f".repeat(64) } }).ipHash).toBe("f".repeat(64));
    expect(actionDtoToRow({ ...base, extended: { ip_hash: null } }).ipHash).toBe("");
  });

  it("keeps both change-log hashes, with null when the backend sends none", () => {
    const base: ChangeLogDto = { id: "6", table_name: "admin_invitations", row_pk: "inv-1", operation: "INSERT" };
    const first = changeDtoToRow({ ...base, prev_row_hash: null, row_hash: "a".repeat(64) });
    expect(first.prevRowHash).toBeNull();
    expect(first.rowHash).toBe("a".repeat(64));
    const linked = changeDtoToRow({ ...base, prev_row_hash: "b".repeat(64), row_hash: "a".repeat(64) });
    expect(linked.prevRowHash).toBe("b".repeat(64));
    expect(changeDtoToRow(base).rowHash).toBeNull();
  });
});
