import { z } from "zod";

export type PolicyMessages = {
  atLeast: (n: number) => string;
  passwordFloor: string;
  mustBeNumber: string;
  mustBeInteger: string;
};

export function policySchema(msgs: PolicyMessages) {
  const num = () => z.number({ error: msgs.mustBeNumber });
  const min = (minimum: number) => num().int(msgs.mustBeInteger).min(minimum, msgs.atLeast(minimum));
  return z.object({
    max_failed_attempts: min(1),
    lockout_duration_minutes: min(1),
    access_token_ttl_minutes: min(1),
    refresh_token_ttl_days: min(1),
    password_min_length: num().int(msgs.mustBeInteger).min(6, msgs.passwordFloor).max(128, msgs.passwordFloor),
    password_history_check_count: min(0),
    password_max_age_days: min(0),
    sensitive_action_reauth_minutes: min(0),
    password_require_uppercase: z.boolean(),
    password_require_lowercase: z.boolean(),
    password_require_number: z.boolean(),
    password_require_symbol: z.boolean(),
    mfa_required: z.boolean(),
  });
}
export type PolicyForm = z.infer<ReturnType<typeof policySchema>>;

export function reasonSchema(msgs: { reasonRequired: string }) {
  return z.object({ reason: z.string().trim().min(1, msgs.reasonRequired) });
}
export type ReasonForm = z.infer<ReturnType<typeof reasonSchema>>;
