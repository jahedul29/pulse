import type { PolicyForm } from "./schemas";

export interface SecurityPolicyDto {
  id: number;
  max_failed_attempts: number;
  lockout_duration_minutes: number;
  access_token_ttl_minutes: number;
  refresh_token_ttl_days: number;
  password_min_length: number;
  password_require_uppercase: boolean;
  password_require_lowercase: boolean;
  password_require_number: boolean;
  password_require_symbol: boolean;
  password_max_age_days: number;
  password_history_check_count: number;
  mfa_required: boolean;
  sensitive_action_reauth_minutes: number;
  fd?: string | null;
  td?: string | null;
  change_reason?: string | null;
  created_by_admin_id?: string | null;
  created_at?: string | null;
  created_by?: { id: string; email: string; staff_id?: number } | null;
}

export interface StorePolicyBody extends PolicyForm {
  change_reason: string;
}

export const POLICY_FORM_KEYS = [
  "max_failed_attempts",
  "lockout_duration_minutes",
  "access_token_ttl_minutes",
  "refresh_token_ttl_days",
  "password_min_length",
  "password_history_check_count",
  "password_max_age_days",
  "sensitive_action_reauth_minutes",
  "password_require_uppercase",
  "password_require_lowercase",
  "password_require_number",
  "password_require_symbol",
  "mfa_required",
] as const;

export function policyToForm(dto: SecurityPolicyDto): PolicyForm {
  return {
    max_failed_attempts: dto.max_failed_attempts,
    lockout_duration_minutes: dto.lockout_duration_minutes,
    access_token_ttl_minutes: dto.access_token_ttl_minutes,
    refresh_token_ttl_days: dto.refresh_token_ttl_days,
    password_min_length: dto.password_min_length,
    password_history_check_count: dto.password_history_check_count,
    password_max_age_days: dto.password_max_age_days,
    sensitive_action_reauth_minutes: dto.sensitive_action_reauth_minutes,
    password_require_uppercase: dto.password_require_uppercase,
    password_require_lowercase: dto.password_require_lowercase,
    password_require_number: dto.password_require_number,
    password_require_symbol: dto.password_require_symbol,
    mfa_required: dto.mfa_required,
  };
}
