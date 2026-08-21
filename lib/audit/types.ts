import type { LoginResult } from "@/lib/auth/types";

export type LoginMethod = "password_mfa" | "biometric" | "sso" | "refresh_token";

export interface LoginAuditEntry {
  id: string;
  createdAt: number;
  attemptedIdentifier: string;
  adminAccountId: string | null;
  adminName: string | null;
  result: LoginResult;
  method: LoginMethod;
  ip: string;
  device: string;
}

export interface LoginAuditQuery {
  dateFrom?: number | null;
  dateTo?: number | null;
  results?: LoginResult[];
  adminId?: string | null;
}

export type { LoginResult };
