import { roleSchema, grantSchema, overlaySchema } from "./schemas";

describe("roleSchema", () => {
  const schema = roleSchema({ nameRequired: "req" });

  it("rejects an empty name", () => {
    expect(schema.safeParse({ name: "  ", description: "" }).success).toBe(false);
  });

  it("accepts any non-empty name (duplication is a backend check)", () => {
    expect(schema.safeParse({ name: "admin", description: "" }).success).toBe(true);
    expect(schema.safeParse({ name: "Auditor", description: "x" }).success).toBe(true);
  });
});

describe("grantSchema", () => {
  const schema = grantSchema(
    { roleRequired: "req", duplicateRole: "dup" },
    { existingRoleIds: ["role_admin"] },
  );

  it("rejects an empty role", () => {
    expect(schema.safeParse({ roleId: "" }).success).toBe(false);
  });

  it("rejects an already-granted role", () => {
    expect(schema.safeParse({ roleId: "role_admin" }).success).toBe(false);
  });

  it("accepts a new role", () => {
    expect(schema.safeParse({ roleId: "role_auditor" }).success).toBe(true);
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
