import { inviteSchema } from "./schemas";

const messages = {
  staffRequired: "staff",
  roleRequired: "role",
};
const schema = () => inviteSchema(messages);

describe("inviteSchema", () => {
  it("accepts a valid invite (staff + at least one role)", () => {
    const result = schema().safeParse({ staffId: "st-1", email: "", roleIds: ["3"] });
    expect(result.success).toBe(true);
  });

  it("requires a staff member", () => {
    const result = schema().safeParse({ staffId: "", email: "", roleIds: ["3"] });
    expect(result.success).toBe(false);
  });

  it("does not validate email (read-only display, BE ignores it)", () => {
    const result = schema().safeParse({ staffId: "st-1", email: "nope", roleIds: ["3"] });
    expect(result.success).toBe(true);
  });

  it("requires at least one role", () => {
    const result = schema().safeParse({ staffId: "st-1", email: "new@abapro.health", roleIds: [] });
    expect(result.success).toBe(false);
  });
});
