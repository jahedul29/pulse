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
    const r = schema.safeParse({ code: "", category: "auth", en: "<p>hi</p>", ar: "" });
    expect(r.success).toBe(false);
  });

  it("rejects a bad code format", () => {
    const r = schema.safeParse({ code: "bad code", category: "auth", en: "<p>hi</p>", ar: "" });
    expect(r.success).toBe(false);
  });

  it("rejects a duplicate code", () => {
    const r = schema.safeParse({ code: "AUTH_OTP", category: "auth", en: "<p>hi</p>", ar: "" });
    expect(r.success).toBe(false);
  });

  it("rejects empty English copy", () => {
    const r = schema.safeParse({ code: "SYS_X", category: "system", en: "<p></p>", ar: "<p>ar</p>" });
    expect(r.success).toBe(false);
  });

  it("rejects empty Arabic copy", () => {
    const r = schema.safeParse({ code: "SYS_X", category: "system", en: "<p>hi</p>", ar: "<p></p>" });
    expect(r.success).toBe(false);
  });

  it("accepts a valid new template with both languages", () => {
    const r = schema.safeParse({ code: "SYS_X", category: "system", en: "<p>hi</p>", ar: "<p>مرحبا</p>" });
    expect(r.success).toBe(true);
  });
});

describe("templateSchema (edit)", () => {
  it("does not re-validate the (immutable) code", () => {
    const schema = templateSchema(tMsgs, { existingCodes: ["AUTH_OTP"], isCreate: false });
    const r = schema.safeParse({ code: "AUTH_OTP", category: "auth", en: "<p>hi</p>", ar: "<p>مرحبا</p>" });
    expect(r.success).toBe(true);
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
    const r = schema.safeParse({ ...base, templateByRole: {} });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(
        r.error.issues.some(
          (i) => i.path[0] === "templateByRole" && i.path[1] === "client" && i.message === "tpl-req",
        ),
      ).toBe(true);
    }
  });

  it("accepts a notified role that has a template", () => {
    const r = schema.safeParse({ ...base, templateByRole: { client: "AUTH_OTP" } });
    expect(r.success).toBe(true);
  });

  it("ignores template for a non-notified role", () => {
    const r = schema.safeParse({
      eventId: "ev",
      eventName: "Event",
      recipients: { client: false, rbt: false, sltot: false, bcba: false },
      templateByRole: {},
    });
    expect(r.success).toBe(true);
  });
});

describe("routingSchema", () => {
  const schema = routingSchema({ recipientRequired: "rec-req" });
  const base = { eventId: "ev", eventName: "Event", generatesTicket: false, urgency: "low" as const };

  it("rejects zero recipients, keyed at recipients", () => {
    const r = schema.safeParse({
      ...base,
      recipients: { client: false, rbt: false, sltot: false, bcba: false },
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path[0] === "recipients" && i.message === "rec-req")).toBe(
        true,
      );
    }
  });

  it("accepts at least one recipient", () => {
    const r = schema.safeParse({
      ...base,
      recipients: { client: true, rbt: false, sltot: false, bcba: false },
    });
    expect(r.success).toBe(true);
  });
});
