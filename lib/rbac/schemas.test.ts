import { roleSchema, grantSchema, overlaySchema } from "./schemas";
import { MODULE_IDS } from "./modules";

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
    expect(schema.safeParse({ roleId: "", expiresAt: null }).success).toBe(false);
  });

  it("rejects an already-granted role", () => {
    expect(schema.safeParse({ roleId: "role_admin", expiresAt: null }).success).toBe(false);
  });

  it("accepts a new role with an optional expiry", () => {
    expect(schema.safeParse({ roleId: "role_auditor", expiresAt: 123 }).success).toBe(true);
  });
});

describe("overlaySchema", () => {
  const mod = MODULE_IDS[0];
  const schema = overlaySchema({ duplicateOverlay: "dup" }, { existingKeys: [`${mod}:view`] });

  it("rejects a duplicate module+action overlay", () => {
    expect(schema.safeParse({ moduleId: mod, action: "view" }).success).toBe(false);
  });

  it("accepts a new module+action overlay", () => {
    expect(schema.safeParse({ moduleId: mod, action: "edit" }).success).toBe(true);
  });
});
