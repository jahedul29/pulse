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

export function effectiveStatus(user: AdminUser, now: number): EffectiveStatus {
  return user.lockedUntil != null && user.lockedUntil > now ? "locked" : user.status;
}

export function canResend(user: AdminUser, now: number): boolean {
  if (user.status !== "pending") return false;
  return user.lastInviteSentAt == null || now - user.lastInviteSentAt >= RESEND_COOLDOWN_MS;
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
