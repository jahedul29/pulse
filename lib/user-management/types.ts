export type AdminUserStatus = "pending" | "active" | "suspended" | "deactivated" | "revoked";

export type EffectiveStatus = AdminUserStatus | "locked";

export interface AdminUser {
  id: string;
  staffId: string;
  name: string;
  email: string;
  initials: string;
  status: AdminUserStatus;
  mfaEnabled: boolean;
  lockedUntil: number | null;
  lastLogin: number | null;
  roleIds: string[];
  invitedBy: string;
  invitedAt: number;
  activatedAt: number | null;
  lastStatusChangeAt: number | null;
  lastStatusChangeBy: string | null;
  registeredDevices: number;
  lastInviteSentAt: number | null;
  willFailMutation?: boolean;
}

const RESEND_COOLDOWN_MS = 60_000;

export function effectiveStatus(u: AdminUser, now: number): EffectiveStatus {
  return u.lockedUntil != null && u.lockedUntil > now ? "locked" : u.status;
}

export function canResend(u: AdminUser, now: number): boolean {
  if (u.status !== "pending") return false;
  return u.lastInviteSentAt == null || now - u.lastInviteSentAt >= RESEND_COOLDOWN_MS;
}

export type AdminUserRow = AdminUser & {
  effectiveStatus: EffectiveStatus;
  resendReady: boolean;
};

export interface AdminUsersQuery {
  search?: string;
  statuses?: EffectiveStatus[];
  roleIds?: string[];
  page?: number;
  pageSize?: number;
}

export interface InviteInput {
  staffId: string;
  name: string;
  email: string;
  initials: string;
  roleIds: string[];
  by: string;
}
