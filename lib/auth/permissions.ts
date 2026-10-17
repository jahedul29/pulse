import { useAuthStore } from "./store";
import type { Session } from "./types";

export const PERMISSIONS = {
  USER_MANAGEMENT_EDIT: "USER_MANAGEMENT.user_management.EDIT",
  INVITATIONS_EDIT: "USER_MANAGEMENT.invitations.EDIT",
  ROLES_EDIT: "ROLES.roles.EDIT",
  SECURITY_POLICY_EDIT: "ROLES.security_policy.EDIT",
  NOTIFICATION_TEMPLATES_EDIT: "NOTIFICATIONS.notification_templates.EDIT",
  ALERT_ROUTES_EDIT: "NOTIFICATIONS.alert_routes.EDIT",
  TECHNICAL_VIEW: "TECHNICAL.technical.VIEW",
  TECHNICAL_EDIT: "TECHNICAL.technical.EDIT",
  USER_MANAGEMENT_VIEW: "USER_MANAGEMENT.user_management.VIEW",
  INVITATIONS_VIEW: "USER_MANAGEMENT.invitations.VIEW",
  ROLES_VIEW: "ROLES.roles.VIEW",
  PERMISSIONS_VIEW: "PERMISSIONS.permissions.VIEW",
  SECURITY_POLICY_VIEW: "ROLES.security_policy.VIEW",
  NOTIFICATION_TEMPLATES_VIEW: "NOTIFICATIONS.notification_templates.VIEW",
  NOTIFICATION_DELIVERIES_VIEW: "NOTIFICATIONS.notification_deliveries.VIEW",
  NOTIFICATION_CHANNELS_VIEW: "NOTIFICATIONS.notification_channels.VIEW",
  NOTIFICATION_CAMPAIGNS_VIEW: "NOTIFICATIONS.notification_campaigns.VIEW",
  ALERT_ROUTES_VIEW: "NOTIFICATIONS.alert_routes.VIEW",
  LIVE_ALERTS_VIEW: "NOTIFICATIONS.live_alerts.VIEW",
  EDR_EVENT_TYPES_VIEW: "NOTIFICATIONS.edr_event_types.VIEW",
  STAFF_VIEW: "PERSONNEL.staff.VIEW",
  SPECIALISTS_VIEW: "SPECIALISTS.specialists.VIEW",
  CLIENTS_VIEW: "CLIENTS.clients.VIEW",
  ORDERS_VIEW: "ORDERS.orders.VIEW",
  CONTENT_VIEW: "CONTENT.content.VIEW",
  DISCOUNTS_VIEW: "DISCOUNTS_CAMPAIGNS.discounts_campaigns.VIEW",
  EVENTS_VIEW: "EVENTS_TICKETS.events_tickets.VIEW",
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
  return Object.hasOwn(ROLE_FALLBACK, session.role) ? ROLE_FALLBACK[session.role].includes(code) : false;
}

export function useHasPermission(code: string): boolean {
  return useAuthStore((state) => sessionHasPermission(state.session, code));
}
