import { useUserStore } from "./store";
import { useStaffStore } from "@/lib/staff/store";
import type { StaffRecord } from "@/lib/staff/types";
import {
  canResend,
  effectiveStatus,
  type AdminUser,
  type AdminUserRow,
  type AdminUsersQuery,
} from "./types";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function toRow(user: AdminUser, now: number): AdminUserRow {
  return { ...user, effectiveStatus: effectiveStatus(user, now), resendReady: canResend(user, now) };
}

export async function fetchAdminUsers(query: AdminUsersQuery = {}): Promise<AdminUserRow[]> {
  const now = Date.now();
  const { search, statuses, roleIds } = query;
  const term = search?.trim().toLowerCase();
  return useUserStore
    .getState()
    .users.map((user) => toRow(user, now))
    .filter(
      (user) =>
        !term || user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term),
    )
    .filter((user) => !statuses || statuses.length === 0 || statuses.includes(user.effectiveStatus))
    .filter(
      (user) => !roleIds || roleIds.length === 0 || user.roleIds.some((roleId) => roleIds.includes(roleId)),
    )
    .sort((userA, userB) => userB.invitedAt - userA.invitedAt);
}

export async function fetchAdminUser(id: string): Promise<AdminUserRow | null> {
  const now = Date.now();
  const user = useUserStore.getState().users.find((x) => x.id === id);
  return user ? toRow(user, now) : null;
}

export async function commitStatusChange(id: string, actorEmail?: string): Promise<void> {
  await wait(400);
  const user = useUserStore.getState().users.find((x) => x.id === id);
  if (!user) return;
  if (actorEmail && user.email.trim().toLowerCase() === actorEmail.trim().toLowerCase())
    throw new Error("self-action-forbidden");
  if (user.willFailMutation) throw new Error("mutation-failed");
}

export async function adminEmailExists(email: string, excludeId?: string): Promise<boolean> {
  await wait(300);
  const target = email.trim().toLowerCase();
  if (!target) return false;
  return useUserStore
    .getState()
    .users.some(
      (user) =>
        user.id !== excludeId &&
        user.status !== "revoked" &&
        user.email.trim().toLowerCase() === target,
    );
}

export async function fetchUnlinkedStaff(): Promise<StaffRecord[]> {
  const occupied = new Set(
    useUserStore
      .getState()
      .users.filter((user) => user.status !== "revoked")
      .map((user) => user.staffId),
  );
  return useStaffStore
    .getState()
    .staff.filter((staffMember) => !staffMember.terminated && !occupied.has(staffMember.id))
    .sort((staffA, staffB) => staffA.name.localeCompare(staffB.name));
}
