import { useAuthStore } from "./store";
import type { Session } from "./types";

export const PERMISSIONS = {
  USER_MANAGEMENT_EDIT: "USER_MANAGEMENT.user_management.EDIT",
  INVITATIONS_EDIT: "USER_MANAGEMENT.invitations.EDIT",
  ROLES_EDIT: "ROLES.roles.EDIT",
  SECURITY_POLICY_EDIT: "ROLES.security_policy.EDIT",
  NOTIFICATION_TEMPLATES_EDIT: "NOTIFICATIONS.notification_templates.EDIT",
  ALERT_ROUTES_EDIT: "NOTIFICATIONS.alert_routes.EDIT",
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ALL_PERMISSIONS: readonly string[] = Object.values(PERMISSIONS);

const ROLE_FALLBACK: Record<string, readonly string[]> = {
  superadmin: ALL_PERMISSIONS,
  Owner: ALL_PERMISSIONS,
  Administrator: ALL_PERMISSIONS,
};

export function sessionHasPermission(
  session: Pick<Session, "role" | "permissions"> | null | undefined,
  code: string,
): boolean {
  if (!session) return false;
  if (session.permissions) return session.permissions.includes(code);
  return (ROLE_FALLBACK[session.role] ?? []).includes(code);
}

export function useHasPermission(code: string): boolean {
  return useAuthStore((state) => sessionHasPermission(state.session, code));
}
