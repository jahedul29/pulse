export interface SecurityPolicy {
  lockoutThreshold: number;
  lockoutDurationMins: number;
  sessionLifetimeMins: number;
  tokenLifetimeMins: number;
  passwordMinLength: number;
  passwordRequireUpper: boolean;
  passwordRequireNumber: boolean;
  passwordRequireSymbol: boolean;
  passwordHistoryCount: number;
  mfaRequired: boolean;
  reauthWindowMins: number;
  inviteExpiryDays: number;
}

export interface PolicyVersion {
  id: string;
  policy: SecurityPolicy;
  effectiveFrom: number;
  effectiveTo: number | null;
  reason: string;
  changedBy: string;
}
