import type { StaffRecord } from "@/lib/staff/types";
import type { AdminUser, AdminUserRow, AdminUserStatus, EffectiveStatus, RoleRef } from "./types";

export type UserStatusWire = "PENDING" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED";

export interface RoleRefDto {
  id: number;
  name: string;
  description?: string;
  is_system?: boolean;
}

export interface StaffDto {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  nickname?: string | null;
  profile_picture_document_id?: string | null;
  personal_email?: string | null;
  termination_date?: string | null;
}

export interface UserDto {
  id: string;
  staff_id: number;
  email: string;
  preferred_language?: string | null;
  status: UserStatusWire;
  status_reason?: string | null;
  invited_by_admin_id?: string | null;
  activated_at?: string | null;
  last_login_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  staff?: StaffDto | null;
  roles?: RoleRefDto[];
}

export interface PermissionRefDto {
  id: number;
  code?: string;
  description?: string;
  is_sensitive?: boolean;
}

export interface InvitationDto {
  id: string;
  staff_id: number;
  email?: string | null;
  invited_by_admin_id?: string | null;
  status: string;
  expires_at?: string | null;
  accepted_at?: string | null;
  created_at?: string | null;
  staff?: StaffDto | null;
}

export interface UserDetailDto extends UserDto {
  permissions?: PermissionRefDto[];
  latest_invitation?: InvitationDto | null;
}

export interface StoreUserBody {
  staff_id: number;
  password: string;
  preferred_language?: string;
  status?: UserStatusWire;
}

export interface UpdateUserBody {
  password?: string;
  preferred_language?: string;
  status?: UserStatusWire;
  status_reason?: string | null;
}

export interface SendInvitationBody {
  staff_id: number;
}

const STATUS_TO_APP: Record<UserStatusWire, AdminUserStatus> = {
  PENDING: "pending",
  ACTIVE: "active",
  SUSPENDED: "suspended",
  DEACTIVATED: "deactivated",
};

const STATUS_TO_WIRE: Partial<Record<AdminUserStatus, UserStatusWire>> = {
  pending: "PENDING",
  active: "ACTIVE",
  suspended: "SUSPENDED",
  deactivated: "DEACTIVATED",
};

export function normalizeStatus(wire: string): AdminUserStatus {
  return STATUS_TO_APP[wire?.toUpperCase() as UserStatusWire] ?? "pending";
}

export function toWireStatus(status: AdminUserStatus): UserStatusWire | undefined {
  return STATUS_TO_WIRE[status];
}

export function normalizeInvitationStatus(wire: string): AdminUserStatus {
  const value = (wire ?? "").toLowerCase();
  if (value.includes("accept")) return "active";
  if (value.includes("revok") || value.includes("cancel")) return "revoked";
  return "pending";
}

export function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function staffName(staff: StaffDto | null | undefined, fallback: string): string {
  if (!staff) return fallback;
  const full = `${staff.first_name ?? ""} ${staff.last_name ?? ""}`.trim();
  return full || staff.nickname || fallback;
}

function toEpoch(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function rolesFromDto(roles: RoleRefDto[] | undefined): RoleRef[] {
  return (roles ?? []).map((role) => ({ id: String(role.id), name: role.name }));
}

function withDerived(user: AdminUser): AdminUserRow {
  return { ...user, effectiveStatus: user.status as EffectiveStatus, resendReady: false };
}

export function userDtoToRow(dto: UserDto): AdminUserRow {
  const name = staffName(dto.staff, dto.email);
  const createdAt = toEpoch(dto.created_at) ?? 0;
  const roles = rolesFromDto(dto.roles);
  return withDerived({
    id: dto.id,
    staffId: String(dto.staff_id),
    name,
    email: dto.email,
    initials: initialsOf(name),
    status: normalizeStatus(dto.status),
    lockedUntil: null,
    lastLogin: toEpoch(dto.last_login_at),
    roleIds: roles.map((role) => role.id),
    roles,
    invitedBy: dto.invited_by_admin_id ?? "",
    invitationId: null,
    preferredLanguage: dto.preferred_language ?? null,
    invitedAt: createdAt,
    activatedAt: toEpoch(dto.activated_at),
    lastStatusChangeAt: toEpoch(dto.updated_at),
    lastStatusChangeBy: null,
    registeredDevices: 0,
    lastInviteSentAt: null,
  });
}

export function invitationDtoToRow(dto: InvitationDto): AdminUserRow {
  const name = staffName(dto.staff, dto.email ?? "");
  const createdAt = toEpoch(dto.created_at) ?? 0;
  return withDerived({
    id: dto.id,
    staffId: String(dto.staff_id),
    name,
    email: dto.email ?? "",
    initials: initialsOf(name || "?"),
    status: normalizeInvitationStatus(dto.status),
    lockedUntil: null,
    lastLogin: null,
    roleIds: [],
    roles: [],
    invitedBy: dto.invited_by_admin_id ?? "",
    invitationId: dto.id,
    preferredLanguage: null,
    invitedAt: createdAt,
    activatedAt: toEpoch(dto.accepted_at),
    lastStatusChangeAt: null,
    lastStatusChangeBy: null,
    registeredDevices: 0,
    lastInviteSentAt: createdAt,
  });
}

export interface AdminUserDetail extends AdminUserRow {
  staffTerminated: boolean;
}

export function userDetailToDetail(dto: UserDetailDto): AdminUserDetail {
  return { ...userDtoToRow(dto), staffTerminated: Boolean(dto.staff?.termination_date) };
}

export function staffDtoToRecord(dto: StaffDto): StaffRecord {
  const name = staffName(dto, dto.personal_email ?? "");
  return {
    id: String(dto.id),
    name,
    email: dto.personal_email ?? "",
    initials: initialsOf(name || "?"),
    title: "",
    department: "",
    terminated: Boolean(dto.termination_date),
  };
}
