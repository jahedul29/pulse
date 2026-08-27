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
    const r = schema().safeParse({
      staffId: "st-1",
      email: "new@abapro.health",
      roleIds: ["role-admin"],
    });
    expect(r.success).toBe(true);
  });

  it("requires a staff member", () => {
    const r = schema().safeParse({ staffId: "", email: "new@abapro.health", roleIds: ["role-admin"] });
    expect(r.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const r = schema().safeParse({ staffId: "st-1", email: "nope", roleIds: ["role-admin"] });
    expect(r.success).toBe(false);
  });

  it("rejects a duplicate email (case-insensitive)", () => {
    const r = schema().safeParse({
      staffId: "st-1",
      email: "TAKEN@abapro.health",
      roleIds: ["role-admin"],
    });
    expect(r.success).toBe(false);
  });

  it("requires at least one role", () => {
    const r = schema().safeParse({ staffId: "st-1", email: "new@abapro.health", roleIds: [] });
    expect(r.success).toBe(false);
  });
});
