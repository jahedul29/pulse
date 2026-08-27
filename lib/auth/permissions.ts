import { useAuthStore } from "./store";

export const PERMISSIONS = {
  ACCOUNT_LOCK_EDIT: "SECURITY.account_lock.EDIT",
  USER_MANAGEMENT_EDIT: "USER_MANAGEMENT.EDIT",
} as const;

const ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  Owner: [PERMISSIONS.ACCOUNT_LOCK_EDIT, PERMISSIONS.USER_MANAGEMENT_EDIT],
  Administrator: [PERMISSIONS.ACCOUNT_LOCK_EDIT, PERMISSIONS.USER_MANAGEMENT_EDIT],
  Analyst: [],
  Member: [],
};

export function roleHasPermission(role: string | undefined, code: string): boolean {
  if (!role) return false;
  return (ROLE_PERMISSIONS[role] ?? []).includes(code);
}

export function useHasPermission(code: string): boolean {
  const role = useAuthStore((s) => s.session?.role);
  return roleHasPermission(role, code);
}
