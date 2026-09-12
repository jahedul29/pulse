import { apiData, apiFetch, apiList } from "@/lib/api/client";
import type { Paginated } from "@/lib/api/client";
import { ADMIN_IDENTITY } from "@/lib/api/config";
import { buildListQuery, listAll, type ListParams } from "@/lib/api/list-query";
import type { StaffRecord } from "@/lib/staff/types";
import {
  normalizeInvitationStatus,
  staffDtoToRecord,
  toWireStatus,
  userDtoToRow,
  type InvitationDto,
  type StaffDto,
  type UpdateUserBody,
  type UserDetailDto,
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

export async function fetchPendingInvitationMap(): Promise<Record<string, string>> {
  const invitations = await listAll<InvitationDto>(INVITATIONS, { relations: ["staff"] });
  const map: Record<string, string> = {};
  for (const invitation of invitations) {
    if (normalizeInvitationStatus(invitation.status) === "pending") {
      map[String(invitation.staff_id)] = invitation.id;
    }
  }
  return map;
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

export function sendInvitation(staffId: string): Promise<InvitationDto> {
  return apiData<InvitationDto>(INVITATIONS, { method: "POST", body: { staff_id: Number(staffId) } });
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
    query: { search: search?.trim() || undefined, per_page: 50 },
  });
  return staff.data
    .map(staffDtoToRecord)
    .filter((staffMember) => !staffMember.terminated)
    .sort((staffA, staffB) => staffA.name.localeCompare(staffB.name));
}

export async function fetchLinkedStaffIds(): Promise<string[]> {
  const [users, invitations] = await Promise.all([
    listAll<UserDto>(USERS),
    listAll<InvitationDto>(INVITATIONS),
  ]);
  const linked = new Set<string>();
  for (const user of users) linked.add(String(user.staff_id));
  for (const invitation of invitations) {
    if (normalizeInvitationStatus(invitation.status) !== "revoked") linked.add(String(invitation.staff_id));
  }
  return [...linked];
}
