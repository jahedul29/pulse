import { deviceLabelFromUA } from "@/lib/device";
import type { LoginAuditEntry } from "./types";

export interface StaffRef {
  first_name?: string | null;
  last_name?: string | null;
}

export interface AdminAccountRef {
  id?: string;
  email?: string | null;
  staff?: StaffRef | null;
}

export interface LoginAuditLogDto {
  id: string;
  admin_account_id?: string | null;
  admin_account?: AdminAccountRef | null;
  attempted_identifier: string;
  result: string;
  method: string;
  user_agent?: string | null;
  created_at?: string | null;
}

export function toEpoch(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function accountName(account: AdminAccountRef | null | undefined): string | null {
  if (!account) return null;
  const full = `${account.staff?.first_name ?? ""} ${account.staff?.last_name ?? ""}`.trim();
  return full || account.email || null;
}

export function loginAuditDtoToEntry(dto: LoginAuditLogDto): LoginAuditEntry {
  return {
    id: dto.id,
    createdAt: toEpoch(dto.created_at),
    attemptedIdentifier: dto.attempted_identifier,
    adminAccountId: dto.admin_account_id ?? null,
    adminName: accountName(dto.admin_account),
    result: dto.result,
    method: dto.method,
    ip: "",
    device: dto.user_agent ? deviceLabelFromUA(dto.user_agent) : "",
  };
}
