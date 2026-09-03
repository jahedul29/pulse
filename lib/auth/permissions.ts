import { useAuthStore } from "./store";

export const PERMISSIONS = {
  ACCOUNT_LOCK_EDIT: "SECURITY.account_lock.EDIT",
  USER_MANAGEMENT_EDIT: "USER_MANAGEMENT.EDIT",
} as const;

const ADMIN_EDIT = [PERMISSIONS.ACCOUNT_LOCK_EDIT, PERMISSIONS.USER_MANAGEMENT_EDIT];

const ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  superadmin: ADMIN_EDIT,
  admin: ADMIN_EDIT,
  Owner: ADMIN_EDIT,
  Administrator: ADMIN_EDIT,
  Analyst: [],
  Member: [],
};

export function roleHasPermission(role: string | undefined, code: string): boolean {
  if (!role) return false;
  return (ROLE_PERMISSIONS[role] ?? []).includes(code);
}

export function useHasPermission(code: string): boolean {
  const role = useAuthStore((state) => state.session?.role);
  return roleHasPermission(role, code);
}
