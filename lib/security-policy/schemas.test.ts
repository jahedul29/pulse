import { policySchema, reasonSchema } from "./schemas";
import type { SecurityPolicy } from "./types";

const valid: SecurityPolicy = {
  lockoutThreshold: 5,
  lockoutDurationMins: 15,
  sessionLifetimeMins: 60,
  tokenLifetimeMins: 30,
  passwordMinLength: 12,
  passwordRequireUpper: true,
  passwordRequireNumber: true,
  passwordRequireSymbol: false,
  passwordHistoryCount: 3,
  mfaRequired: true,
  reauthWindowMins: 10,
  inviteExpiryDays: 7,
};

describe("policySchema", () => {
  const schema = policySchema({
    atLeast: (minimum) => `min ${minimum}`,
    passwordFloor: "floor",
    mustBeNumber: "not-a-number",
    mustBeInteger: "not-an-integer",
  });

  it("accepts a valid policy", () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it("reports a human message for an empty (NaN) number field", () => {
    const result = schema.safeParse({ ...valid, lockoutThreshold: Number.NaN });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message === "not-a-number")).toBe(true);
    }
  });

  it("rejects a lockout threshold below 1", () => {
    expect(schema.safeParse({ ...valid, lockoutThreshold: 0 }).success).toBe(false);
  });

  it("rejects a too-short password minimum", () => {
    expect(schema.safeParse({ ...valid, passwordMinLength: 4 }).success).toBe(false);
  });

  it("rejects an invitation expiry below 1 day", () => {
    expect(schema.safeParse({ ...valid, inviteExpiryDays: 0 }).success).toBe(false);
  });

  it("reports a translated message for a non-integer value", () => {
    const result = schema.safeParse({ ...valid, sessionLifetimeMins: 1.5 });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some((i) => i.message === "not-an-integer")).toBe(true);
  });
});

describe("reasonSchema", () => {
  const schema = reasonSchema({ reasonRequired: "req" });

  it("rejects an empty reason", () => {
    expect(schema.safeParse({ reason: "   " }).success).toBe(false);
  });

  it("accepts a non-empty reason", () => {
    expect(schema.safeParse({ reason: "Tightened lockout" }).success).toBe(true);
  });
});
