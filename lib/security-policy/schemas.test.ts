import { policySchema, reasonSchema, type PolicyForm } from "./schemas";

const valid: PolicyForm = {
  max_failed_attempts: 5,
  lockout_duration_minutes: 15,
  access_token_ttl_minutes: 60,
  refresh_token_ttl_days: 14,
  password_min_length: 12,
  password_history_check_count: 3,
  password_max_age_days: 90,
  sensitive_action_reauth_minutes: 10,
  password_require_uppercase: true,
  password_require_lowercase: true,
  password_require_number: true,
  password_require_symbol: false,
  mfa_required: true,
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
    const result = schema.safeParse({ ...valid, max_failed_attempts: Number.NaN });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message === "not-a-number")).toBe(true);
    }
  });

  it("rejects a lockout threshold below 1", () => {
    expect(schema.safeParse({ ...valid, max_failed_attempts: 0 }).success).toBe(false);
  });

  it("rejects a too-short password minimum", () => {
    expect(schema.safeParse({ ...valid, password_min_length: 4 }).success).toBe(false);
  });

  it("allows a password max age of 0 (never expires)", () => {
    expect(schema.safeParse({ ...valid, password_max_age_days: 0 }).success).toBe(true);
  });

  it("reports a translated message for a non-integer value", () => {
    const result = schema.safeParse({ ...valid, access_token_ttl_minutes: 1.5 });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some((issue) => issue.message === "not-an-integer")).toBe(true);
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
