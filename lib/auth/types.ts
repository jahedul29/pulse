export type LoginResult =
  | "SUCCESS"
  | "MFA_REQUIRED"
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_LOCKED"
  | "ACCOUNT_PENDING"
  | "ACCOUNT_SUSPENDED"
  | "ACCOUNT_DEACTIVATED"
  | "ACCOUNT_UNLOCKED"
  | "SERVER_ERROR";

export type AccountStatus =
  | "active"
  | "locked"
  | "pending"
  | "suspended"
  | "deactivated";

export interface MockAccount {
  email: string;
  password: string;
  status: AccountStatus;
  mfaEnabled: boolean;
  lockedUntilOffsetMs?: number;
  name: string;
  role: string;
}

export interface AttemptOutcome {
  result: LoginResult;
  lockedUntil?: number;
  email: string;
  name?: string;
  role?: string;
}

export interface AuditEntry {
  id: string;
  email: string;
  result: LoginResult;
  stage: "password" | "mfa" | "admin";
  at: number;
  ip: string;
  device: string;
}

export interface Session {
  email: string;
  name: string;
  role: string;
  token: string;
  issuedAt: number;
}
