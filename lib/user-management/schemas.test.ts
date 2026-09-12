import { inviteSchema } from "./schemas";

const messages = {
  staffRequired: "staff",
  emailRequired: "email-req",
  emailInvalid: "email-bad",
  roleRequired: "role",
};
const schema = () => inviteSchema(messages);

describe("inviteSchema", () => {
  it("accepts a valid invite (staff + email + at least one role)", () => {
    const result = schema().safeParse({ staffId: "st-1", email: "new@abapro.health", roleIds: ["3"] });
    expect(result.success).toBe(true);
  });

  it("requires a staff member", () => {
    const result = schema().safeParse({ staffId: "", email: "new@abapro.health", roleIds: ["3"] });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = schema().safeParse({ staffId: "st-1", email: "nope", roleIds: ["3"] });
    expect(result.success).toBe(false);
  });

  it("requires at least one role", () => {
    const result = schema().safeParse({ staffId: "st-1", email: "new@abapro.health", roleIds: [] });
    expect(result.success).toBe(false);
  });
});
