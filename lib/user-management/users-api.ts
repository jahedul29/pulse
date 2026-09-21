import { apiData, apiFetch, apiList } from "@/lib/api/client";
import type { Paginated } from "@/lib/api/client";
import { ADMIN_IDENTITY } from "@/lib/api/config";
import { buildListQuery, listAll, type ListParams } from "@/lib/api/list-query";
import type { StaffRecord } from "@/lib/staff/types";
import {
  invitationDtoToRow,
  normalizeInvitationStatus,
  staffDtoToRecord,
  toWireStatus,
  userDtoToRow,
  type InvitationDto,
  type StaffDto,
  type UpdateUserBody,
  type UserDetailDto,
  type UserDeviceDto,
  type UserDto,
} from "./dto";
import type { AdminUserRow, AdminUserStatus } from "./types";

export type { ListParams };

const USERS = `${ADMIN_IDENTITY}/users`;
const INVITATIONS = `${ADMIN_IDENTITY}/invitations`;
const STAFF = `${ADMIN_IDENTITY}/staff`;

export async function listAdminUsers(params: ListParams): Promise<Paginated<AdminUserRow>> {
  const { data, meta } = await apiList<UserDto>(USERS, {
    query: { ...buildListQuery(params), relations: ["staff", "roles"] },
  });
  return { data: data.map(userDtoToRow), meta };
}

export async function listAllAdminUsers(): Promise<AdminUserRow[]> {
  const users = await listAll<UserDto>(USERS, { relations: ["staff", "roles"] });
  return users.map(userDtoToRow);
}

export async function fetchPendingInvitations(): Promise<AdminUserRow[]> {
  const invitations = await listAll<InvitationDto>(INVITATIONS, { relations: ["staff", "invitedBy"] });
  return invitations
    .filter((invitation) => {
      const status = normalizeInvitationStatus(invitation.status);
      return status === "pending" || status === "expired";
    })
    .map(invitationDtoToRow)
    .sort((first, second) => second.invitedAt - first.invitedAt);
}

export function fetchUserDevices(id: string): Promise<UserDeviceDto[]> {
  return apiData<UserDeviceDto[]>(`${USERS}/${encodeURIComponent(id)}/devices`);
}

export function fetchInvitation(id: string): Promise<AdminUserRow> {
  return apiData<InvitationDto>(`${INVITATIONS}/${encodeURIComponent(id)}`, {
    query: { relations: ["staff", "invitedBy"] },
  }).then(invitationDtoToRow);
}

export function fetchAdminUserDetail(id: string): Promise<UserDetailDto> {
  return apiData<UserDetailDto>(`${USERS}/${encodeURIComponent(id)}`, {
    query: { relations: ["staff", "roles"] },
  });
}

export async function updateUserStatus(
  id: string,
  status: AdminUserStatus,
  reason?: string,
): Promise<AdminUserRow> {
  const body: UpdateUserBody = { status: toWireStatus(status), status_reason: reason ?? null };
  const dto = await apiData<UserDetailDto>(`${USERS}/${encodeURIComponent(id)}`, { method: "PUT", body });
  return userDtoToRow(dto);
}

export function sendInvitation(staffId: string, roleIds: string[] = []): Promise<InvitationDto> {
  const body: { staff_id: number; role_ids?: number[] } = { staff_id: Number(staffId) };
  if (roleIds.length > 0) body.role_ids = roleIds.map(Number);
  return apiData<InvitationDto>(INVITATIONS, { method: "POST", body });
}

export function resendInvitation(invitationId: string): Promise<InvitationDto> {
  return apiData<InvitationDto>(`${INVITATIONS}/${encodeURIComponent(invitationId)}/resend`, {
    method: "POST",
  });
}

export function revokeInvitation(invitationId: string): Promise<unknown> {
  return apiFetch(`${INVITATIONS}/${encodeURIComponent(invitationId)}`, { method: "DELETE" });
}

export function assignUserRoles(id: string, roleIds: string[]): Promise<unknown> {
  return apiFetch(`${USERS}/${encodeURIComponent(id)}/roles`, {
    method: "PUT",
    body: { role_ids: roleIds.map(Number) },
  });
}

export async function fetchInvitableStaff(search?: string): Promise<StaffRecord[]> {
  const staff = await apiList<StaffDto>(STAFF, {
    query: { search: search?.trim() || undefined, per_page: 50, "filters[invitable]": true },
  });
  return staff.data
    .map(staffDtoToRecord)
    .sort((staffA, staffB) => staffA.name.localeCompare(staffB.name));
}
