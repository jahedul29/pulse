import { templateSchema, alertRouteSchema, mappingSchema } from "./schemas";

const tMsgs = {
  codeRequired: "code-req",
  codeFormat: "code-fmt",
  nameRequired: "name-req",
  channelRequired: "channel-req",
  subjectRequired: "subject-req",
  bodyRequired: "body-req",
};

const validTemplate = {
  code: "SYS_X",
  name: "System notice",
  channelId: "1",
  subjectEn: "Subject",
  subjectAr: "",
  bodyEn: "<p>hi</p>",
  bodyAr: "",
  isActive: true,
};

describe("templateSchema (create)", () => {
  const schema = templateSchema(tMsgs, { isCreate: true });

  it("rejects an empty code", () => {
    expect(schema.safeParse({ ...validTemplate, code: "" }).success).toBe(false);
  });

  it("rejects a bad code format", () => {
    expect(schema.safeParse({ ...validTemplate, code: "bad code" }).success).toBe(false);
  });

  it("rejects a missing channel", () => {
    expect(schema.safeParse({ ...validTemplate, channelId: "" }).success).toBe(false);
  });

  it("rejects an empty English subject", () => {
    expect(schema.safeParse({ ...validTemplate, subjectEn: "  " }).success).toBe(false);
  });

  it("rejects empty English body", () => {
    expect(schema.safeParse({ ...validTemplate, bodyEn: "<p></p>" }).success).toBe(false);
  });

  it("accepts a valid new template (Arabic optional)", () => {
    expect(schema.safeParse(validTemplate).success).toBe(true);
  });
});

describe("templateSchema (edit)", () => {
  it("does not re-validate the immutable code", () => {
    const schema = templateSchema(tMsgs, { isCreate: false });
    expect(schema.safeParse({ ...validTemplate, code: "anything at all" }).success).toBe(true);
  });
});

const rMsgs = {
  codeRequired: "code-req",
  codeFormat: "code-fmt",
  nameRequired: "name-req",
  channelRequired: "channel-req",
  templateRequired: "template-req",
  audienceRequired: "aud-req",
  priorityInvalid: "prio-req",
};

const validRoute = {
  code: "SECURITY_INCIDENT",
  name: "Security incident routing",
  channelId: "5",
  templateId: "1",
  audienceType: "ALL_ADMINS" as const,
  audienceIds: [] as string[],
  priority: 100,
  isActive: true,
};

describe("alertRouteSchema", () => {
  const schema = alertRouteSchema(rMsgs, { isCreate: true });

  it("accepts an ALL_ADMINS route with no recipients", () => {
    expect(schema.safeParse(validRoute).success).toBe(true);
  });

  it("requires a template", () => {
    expect(schema.safeParse({ ...validRoute, templateId: "" }).success).toBe(false);
  });

  it("rejects a ROLE route with no recipients, keyed at audienceIds", () => {
    const result = schema.safeParse({ ...validRoute, audienceType: "ROLE", audienceIds: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === "audienceIds" && issue.message === "aud-req")).toBe(true);
    }
  });

  it("accepts a ROLE route with at least one recipient", () => {
    expect(schema.safeParse({ ...validRoute, audienceType: "ROLE", audienceIds: ["1"] }).success).toBe(true);
  });

  it("rejects a non-integer priority with a human message", () => {
    const result = schema.safeParse({ ...validRoute, priority: Number.NaN });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message === "prio-req")).toBe(true);
    }
  });

  it("rejects a bad code format on create", () => {
    expect(schema.safeParse({ ...validRoute, code: "bad code" }).success).toBe(false);
  });
});

describe("mappingSchema", () => {
  const schema = mappingSchema({ templateRequired: "tpl-req" });
  const base = {
    eventId: "ev",
    eventName: "Event",
    recipients: { client: true, rbt: false, sltot: false, bcba: false },
  };

  it("rejects a notified role with no template", () => {
    const result = schema.safeParse({ ...base, templateByRole: {} });
    expect(result.success).toBe(false);
  });

  it("accepts a notified role that has a template", () => {
    expect(schema.safeParse({ ...base, templateByRole: { client: "AUTH_OTP" } }).success).toBe(true);
  });
});
