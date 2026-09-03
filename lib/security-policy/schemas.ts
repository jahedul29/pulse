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
    lockoutThreshold: min(1),
    lockoutDurationMins: min(1),
    sessionLifetimeMins: min(1),
    tokenLifetimeMins: min(1),
    passwordMinLength: num().int(msgs.mustBeInteger).min(6, msgs.passwordFloor).max(128, msgs.passwordFloor),
    passwordHistoryCount: min(0),
    reauthWindowMins: min(0),
    inviteExpiryDays: min(1),
    passwordRequireUpper: z.boolean(),
    passwordRequireNumber: z.boolean(),
    passwordRequireSymbol: z.boolean(),
    mfaRequired: z.boolean(),
  });
}

export function reasonSchema(msgs: { reasonRequired: string }) {
  return z.object({ reason: z.string().trim().min(1, msgs.reasonRequired) });
}
export type ReasonForm = z.infer<ReturnType<typeof reasonSchema>>;
