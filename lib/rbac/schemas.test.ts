import { roleSchema, grantSchema, overlaySchema } from "./schemas";

describe("roleSchema", () => {
  const schema = roleSchema({ nameRequired: "req" });

  it("rejects an empty name", () => {
    expect(schema.safeParse({ name: "  ", description: "", is_active: true }).success).toBe(false);
  });

  it("accepts any non-empty name (duplication is a backend check)", () => {
    expect(schema.safeParse({ name: "admin", description: "", is_active: true }).success).toBe(true);
    expect(schema.safeParse({ name: "Auditor", description: "x", is_active: false }).success).toBe(true);
  });
});

describe("grantSchema", () => {
  const schema = grantSchema(
    { roleRequired: "req", duplicateRole: "dup", expiryPast: "past" },
    { existingRoleIds: ["role_admin"] },
  );

  it("rejects an empty role", () => {
    expect(schema.safeParse({ roleId: "", expiresOn: "" }).success).toBe(false);
  });

  it("rejects an already-granted role", () => {
    expect(schema.safeParse({ roleId: "role_admin", expiresOn: "" }).success).toBe(false);
  });

  it("accepts a new role with no expiry", () => {
    expect(schema.safeParse({ roleId: "role_auditor", expiresOn: "" }).success).toBe(true);
  });

  it("accepts a future expiry and rejects today or a past date", () => {
    expect(schema.safeParse({ roleId: "role_auditor", expiresOn: "2999-01-01" }).success).toBe(true);
    const past = schema.safeParse({ roleId: "role_auditor", expiresOn: "2000-01-01" });
    expect(past.success).toBe(false);
    expect(past.error?.issues[0].message).toBe("past");
  });
});

describe("overlaySchema", () => {
  const schema = overlaySchema(
    { permissionRequired: "req", duplicateOverlay: "dup" },
    { existingIds: ["7"] },
  );

  it("rejects an empty permission", () => {
    expect(schema.safeParse({ permissionId: "" }).success).toBe(false);
  });

  it("rejects an already-assigned permission", () => {
    expect(schema.safeParse({ permissionId: "7" }).success).toBe(false);
  });

  it("accepts a new permission", () => {
    expect(schema.safeParse({ permissionId: "9" }).success).toBe(true);
  });
});
