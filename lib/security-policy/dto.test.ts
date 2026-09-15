import { policyToForm, type SecurityPolicyDto } from "./dto";

const dto: SecurityPolicyDto = {
  id: 14,
  max_failed_attempts: 5,
  lockout_duration_minutes: 30,
  access_token_ttl_minutes: 60,
  refresh_token_ttl_days: 14,
  password_min_length: 12,
  password_require_uppercase: true,
  password_require_lowercase: true,
  password_require_number: true,
  password_require_symbol: false,
  password_max_age_days: 90,
  password_history_check_count: 5,
  mfa_required: false,
  sensitive_action_reauth_minutes: 15,
  fd: "2026-09-10T15:35:51.000000Z",
  td: "2099-01-01T00:00:00.000000Z",
  change_reason: "Baseline",
  created_by_admin_id: "a1",
  created_at: "2026-09-10T15:35:51.000000Z",
  created_by: { id: "a1", email: "admin@abapro.ai" },
};

describe("policyToForm", () => {
  it("picks only the editable form fields (drops id/audit/relations)", () => {
    expect(policyToForm(dto)).toEqual({
      max_failed_attempts: 5,
      lockout_duration_minutes: 30,
      access_token_ttl_minutes: 60,
      refresh_token_ttl_days: 14,
      password_min_length: 12,
      password_history_check_count: 5,
      password_max_age_days: 90,
      sensitive_action_reauth_minutes: 15,
      password_require_uppercase: true,
      password_require_lowercase: true,
      password_require_number: true,
      password_require_symbol: false,
      mfa_required: false,
    });
  });
});
