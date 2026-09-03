import { inviteSchema } from "./schemas";

const msgs = {
  staffRequired: "staff",
  emailRequired: "email-req",
  emailInvalid: "email-bad",
  emailExists: "email-dupe",
  roleRequired: "role",
};

const schema = () => inviteSchema(msgs, { existingEmails: ["taken@abapro.health"] });

describe("inviteSchema", () => {
  it("accepts a valid invite", () => {
    const result = schema().safeParse({
      staffId: "st-1",
      email: "new@abapro.health",
      roleIds: ["role-admin"],
    });
    expect(result.success).toBe(true);
  });

  it("requires a staff member", () => {
    const result = schema().safeParse({ staffId: "", email: "new@abapro.health", roleIds: ["role-admin"] });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = schema().safeParse({ staffId: "st-1", email: "nope", roleIds: ["role-admin"] });
    expect(result.success).toBe(false);
  });

  it("rejects a duplicate email (case-insensitive)", () => {
    const result = schema().safeParse({
      staffId: "st-1",
      email: "TAKEN@abapro.health",
      roleIds: ["role-admin"],
    });
    expect(result.success).toBe(false);
  });

  it("requires at least one role", () => {
    const result = schema().safeParse({ staffId: "st-1", email: "new@abapro.health", roleIds: [] });
    expect(result.success).toBe(false);
  });
});
