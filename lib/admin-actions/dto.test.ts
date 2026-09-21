import {
  actionDtoToDetail,
  actionDtoToRow,
  changeDtoToDetail,
  changeDtoToRow,
  flattenPayload,
  type AdminActionLogDto,
  type ChangeLogDto,
} from "./dto";

describe("actionDtoToRow", () => {
  const dto: AdminActionLogDto = {
    id: "A-1",
    admin_account_id: "ad-1",
    admin_account: { email: "dana@abapro.health", staff: { first_name: "Dana", last_name: "Okonkwo" } },
    action_code: "user.suspend",
    target_service: "admin-identity",
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
    expect(row.service).toBe("admin-identity");
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
    expect(flattenPayload({ seed: true })).toEqual([{ label: "Seed", value: "true" }]);
  });

  it("joins an array of primitives into one humanized row", () => {
    expect(flattenPayload({ permission_ids: [1, 4, 3, 6, 5, 70] })).toEqual([
      { label: "Permission IDs", value: "1, 4, 3, 6, 5, 70" },
    ]);
  });

  it("flattens an array of objects per index", () => {
    const inputs = flattenPayload({ items: [{ id: 1 }, { id: 2 }] });
    const map = Object.fromEntries(inputs.map((input) => [input.label, input.value]));
    expect(map["Items[0] · ID"]).toBe("1");
    expect(map["Items[1] · ID"]).toBe("2");
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
      target_service: "notify",
      result: "success",
      severity: "info",
      request_payload: { name: "Welcome message" },
    });
    expect(detail.inputs).toEqual([{ label: "Name", value: "Welcome message" }]);
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
