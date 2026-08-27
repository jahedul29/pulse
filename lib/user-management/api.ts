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

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function toRow(u: AdminUser, now: number): AdminUserRow {
  return { ...u, effectiveStatus: effectiveStatus(u, now), resendReady: canResend(u, now) };
}

export async function fetchAdminUsers(query: AdminUsersQuery = {}): Promise<AdminUserRow[]> {
  const now = Date.now();
  const { search, statuses, roleIds } = query;
  const term = search?.trim().toLowerCase();
  return useUserStore
    .getState()
    .users.map((u) => toRow(u, now))
    .filter((u) => !term || u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term))
    .filter((u) => !statuses || statuses.length === 0 || statuses.includes(u.effectiveStatus))
    .filter((u) => !roleIds || roleIds.length === 0 || u.roleIds.some((r) => roleIds.includes(r)))
    .sort((a, b) => b.invitedAt - a.invitedAt);
}

export async function fetchAdminUser(id: string): Promise<AdminUserRow | null> {
  const now = Date.now();
  const u = useUserStore.getState().users.find((x) => x.id === id);
  return u ? toRow(u, now) : null;
}

export async function commitStatusChange(id: string, actorEmail?: string): Promise<void> {
  await wait(400);
  const u = useUserStore.getState().users.find((x) => x.id === id);
  if (!u) return;
  if (actorEmail && u.email.trim().toLowerCase() === actorEmail.trim().toLowerCase())
    throw new Error("self-action-forbidden");
  if (u.willFailMutation) throw new Error("mutation-failed");
}

export async function adminEmailExists(email: string, excludeId?: string): Promise<boolean> {
  await wait(300);
  const target = email.trim().toLowerCase();
  if (!target) return false;
  return useUserStore
    .getState()
    .users.some(
      (u) => u.id !== excludeId && u.status !== "revoked" && u.email.trim().toLowerCase() === target,
    );
}

export async function fetchUnlinkedStaff(): Promise<StaffRecord[]> {
  const occupied = new Set(
    useUserStore
      .getState()
      .users.filter((u) => u.status !== "revoked")
      .map((u) => u.staffId),
  );
  return useStaffStore
    .getState()
    .staff.filter((s) => !s.terminated && !occupied.has(s.id))
    .sort((a, b) => a.name.localeCompare(b.name));
}
