import type { PolicyVersion } from "./types";

const DAY = 86_400_000;

export function seedVersions(): PolicyVersion[] {
  const now = Date.now();
  const t1 = now - 400 * DAY;
  const t2 = now - 120 * DAY;
  const t3 = now - 3 * DAY;
  return [
    {
      id: "pol-v1",
      effectiveFrom: t1,
      effectiveTo: t2,
      reason: "Initial launch policy.",
      changedBy: "System",
      policy: {
        lockoutThreshold: 10,
        lockoutDurationMins: 15,
        sessionLifetimeMins: 1440,
        tokenLifetimeMins: 120,
        passwordMinLength: 8,
        passwordRequireUpper: true,
        passwordRequireNumber: true,
        passwordRequireSymbol: false,
        passwordHistoryCount: 0,
        mfaRequired: false,
        reauthWindowMins: 30,
        inviteExpiryDays: 7,
      },
    },
    {
      id: "pol-v2",
      effectiveFrom: t2,
      effectiveTo: t3,
      reason: "Enabled MFA for all admins and added password history.",
      changedBy: "Sam Al-Rashid",
      policy: {
        lockoutThreshold: 10,
        lockoutDurationMins: 30,
        sessionLifetimeMins: 720,
        tokenLifetimeMins: 60,
        passwordMinLength: 10,
        passwordRequireUpper: true,
        passwordRequireNumber: true,
        passwordRequireSymbol: true,
        passwordHistoryCount: 3,
        mfaRequired: true,
        reauthWindowMins: 15,
        inviteExpiryDays: 7,
      },
    },
    {
      id: "pol-v3",
      effectiveFrom: t3,
      effectiveTo: null,
      reason: "Tightened lockout threshold and password rules after the Q3 security audit.",
      changedBy: "Sam Al-Rashid",
      policy: {
        lockoutThreshold: 5,
        lockoutDurationMins: 30,
        sessionLifetimeMins: 720,
        tokenLifetimeMins: 60,
        passwordMinLength: 12,
        passwordRequireUpper: true,
        passwordRequireNumber: true,
        passwordRequireSymbol: true,
        passwordHistoryCount: 5,
        mfaRequired: true,
        reauthWindowMins: 15,
        inviteExpiryDays: 3,
      },
    },
  ];
}
