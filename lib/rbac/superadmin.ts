import type { AdminUser } from "@/lib/user-management/types";

export const SUPERADMIN_ROLE = "superadmin";

export function isSuperadminRole(name: string | null | undefined): boolean {
  return (name ?? "").trim().toLowerCase() === SUPERADMIN_ROLE;
}

export function holdsSuperadmin(user: Pick<AdminUser, "roles">, now: number): boolean {
  return (user.roles ?? []).some(
    (role) => isSuperadminRole(role.name) && (role.expiresAt == null || role.expiresAt > now),
  );
}

export function activeSuperadminIds(users: AdminUser[], now: number): string[] {
  return users.filter((user) => user.status === "active" && holdsSuperadmin(user, now)).map((user) => user.id);
}

export function isLastActiveSuperadmin(userId: string, users: AdminUser[], now: number): boolean {
  const ids = activeSuperadminIds(users, now);
  return ids.length <= 1 && ids.includes(userId);
}
