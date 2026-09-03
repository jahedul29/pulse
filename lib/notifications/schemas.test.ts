import { templateSchema, mappingSchema, routingSchema } from "./schemas";

const tMsgs = {
  codeRequired: "req",
  codeFormat: "fmt",
  codeExists: "dup",
  enRequired: "en-req",
  arRequired: "ar-req",
};

describe("templateSchema (create)", () => {
  const schema = templateSchema(tMsgs, { existingCodes: ["AUTH_OTP"], isCreate: true });

  it("rejects an empty code", () => {
    const result = schema.safeParse({ code: "", category: "auth", en: "<p>hi</p>", ar: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a bad code format", () => {
    const result = schema.safeParse({ code: "bad code", category: "auth", en: "<p>hi</p>", ar: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a duplicate code", () => {
    const result = schema.safeParse({ code: "AUTH_OTP", category: "auth", en: "<p>hi</p>", ar: "" });
    expect(result.success).toBe(false);
  });

  it("rejects empty English copy", () => {
    const result = schema.safeParse({ code: "SYS_X", category: "system", en: "<p></p>", ar: "<p>ar</p>" });
    expect(result.success).toBe(false);
  });

  it("rejects empty Arabic copy", () => {
    const result = schema.safeParse({ code: "SYS_X", category: "system", en: "<p>hi</p>", ar: "<p></p>" });
    expect(result.success).toBe(false);
  });

  it("accepts a valid new template with both languages", () => {
    const result = schema.safeParse({ code: "SYS_X", category: "system", en: "<p>hi</p>", ar: "<p>مرحبا</p>" });
    expect(result.success).toBe(true);
  });
});

describe("templateSchema (edit)", () => {
  it("does not re-validate the (immutable) code", () => {
    const schema = templateSchema(tMsgs, { existingCodes: ["AUTH_OTP"], isCreate: false });
    const result = schema.safeParse({ code: "AUTH_OTP", category: "auth", en: "<p>hi</p>", ar: "<p>مرحبا</p>" });
    expect(result.success).toBe(true);
  });
});

describe("mappingSchema", () => {
  const schema = mappingSchema({ templateRequired: "tpl-req" });
  const base = {
    eventId: "ev",
    eventName: "Event",
    recipients: { client: true, rbt: false, sltot: false, bcba: false },
  };

  it("rejects a notified role with no template, keyed at templateByRole.<role>", () => {
    const result = schema.safeParse({ ...base, templateByRole: {} });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (i) => i.path[0] === "templateByRole" && i.path[1] === "client" && i.message === "tpl-req",
        ),
      ).toBe(true);
    }
  });

  it("accepts a notified role that has a template", () => {
    const result = schema.safeParse({ ...base, templateByRole: { client: "AUTH_OTP" } });
    expect(result.success).toBe(true);
  });

  it("ignores template for a non-notified role", () => {
    const result = schema.safeParse({
      eventId: "ev",
      eventName: "Event",
      recipients: { client: false, rbt: false, sltot: false, bcba: false },
      templateByRole: {},
    });
    expect(result.success).toBe(true);
  });
});

describe("routingSchema", () => {
  const schema = routingSchema({ recipientRequired: "rec-req" });
  const base = { eventId: "ev", eventName: "Event", generatesTicket: false, urgency: "low" as const };

  it("rejects zero recipients, keyed at recipients", () => {
    const result = schema.safeParse({
      ...base,
      recipients: { client: false, rbt: false, sltot: false, bcba: false },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "recipients" && i.message === "rec-req")).toBe(
        true,
      );
    }
  });

  it("accepts at least one recipient", () => {
    const result = schema.safeParse({
      ...base,
      recipients: { client: true, rbt: false, sltot: false, bcba: false },
    });
    expect(result.success).toBe(true);
  });
});
