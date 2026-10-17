import { ADMIN_ACTION_LOGS_PATH, CHANGE_LOGS_PATH, LOGIN_AUDIT_LOGS_PATH } from "@/lib/api/audit-paths";
import { BUILDER_PATH, COUNTRIES_PATH, REGIONS_PATH } from "@/lib/locations/routes";
import { PERMISSIONS, sessionHasPermission } from "./permissions";
import { safeInternalPath } from "./safe-path";
import type { Session } from "./types";

type AccessSession = Pick<Session, "role" | "permissions"> | null | undefined;

export type ProbeResults = Readonly<Record<string, boolean>>;
export type AccessState = "allowed" | "denied" | "unknown";

interface RouteRule {
  matches: (pathname: string) => boolean;
  anyOf?: readonly string[];
  allOf?: readonly string[];
  probe?: string;
  queryRules?: Readonly<Record<string, readonly string[]>>;
}

function within(prefix: string) {
  return (pathname: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);
}

const ROUTE_RULES: RouteRule[] = [
  { matches: within("/personnel"), anyOf: [PERMISSIONS.SPECIALISTS_VIEW] },
  { matches: within("/clients"), anyOf: [PERMISSIONS.CLIENTS_VIEW] },
  { matches: within("/orders"), anyOf: [PERMISSIONS.ORDERS_VIEW] },
  { matches: within("/content"), anyOf: [PERMISSIONS.CONTENT_VIEW] },
  { matches: within("/discounts"), anyOf: [PERMISSIONS.DISCOUNTS_VIEW] },
  { matches: within("/events"), anyOf: [PERMISSIONS.EVENTS_VIEW] },
  {
    matches: within("/admin/user-management"),
    anyOf: [PERMISSIONS.USER_MANAGEMENT_VIEW, PERMISSIONS.INVITATIONS_VIEW],
    queryRules: { open: [PERMISSIONS.USER_MANAGEMENT_VIEW], invite: [PERMISSIONS.INVITATIONS_VIEW] },
  },
  { matches: within("/admin/accounts"), anyOf: [PERMISSIONS.USER_MANAGEMENT_VIEW, PERMISSIONS.INVITATIONS_VIEW] },
  { matches: within("/admin/access"), anyOf: [PERMISSIONS.USER_MANAGEMENT_VIEW] },
  {
    matches: (pathname) => pathname.startsWith("/admin/roles/"),
    allOf: [PERMISSIONS.ROLES_VIEW, PERMISSIONS.PERMISSIONS_VIEW],
  },
  { matches: within("/admin/roles"), anyOf: [PERMISSIONS.ROLES_VIEW] },
  { matches: within("/admin/settings/security"), anyOf: [PERMISSIONS.SECURITY_POLICY_VIEW] },
  { matches: within("/admin/notifications/templates"), anyOf: [PERMISSIONS.NOTIFICATION_TEMPLATES_VIEW] },
  { matches: within("/admin/notifications/log"), anyOf: [PERMISSIONS.NOTIFICATION_DELIVERIES_VIEW] },
  { matches: within("/admin/notifications/routing"), anyOf: [PERMISSIONS.ALERT_ROUTES_VIEW] },
  { matches: within("/admin/notifications/alerts"), anyOf: [PERMISSIONS.LIVE_ALERTS_VIEW] },
  { matches: within("/admin/notifications/mapping"), anyOf: [PERMISSIONS.EDR_EVENT_TYPES_VIEW] },
  { matches: within("/admin/locations"), anyOf: [PERMISSIONS.TECHNICAL_VIEW] },
  { matches: within("/admin/audit/actions"), probe: ADMIN_ACTION_LOGS_PATH },
  { matches: within("/admin/audit/changes"), probe: CHANGE_LOGS_PATH },
  { matches: within("/admin/audit/logins"), probe: LOGIN_AUDIT_LOGS_PATH },
];

export const PROBE_ENDPOINTS: readonly string[] = ROUTE_RULES.flatMap((rule) => (rule.probe ? [rule.probe] : []));

export const START_PAGES = [
  "/personnel",
  "/admin/user-management",
  "/admin/roles",
  "/admin/access",
  "/admin/audit/actions",
  "/admin/audit/changes",
  "/admin/settings/security",
  "/admin/audit/logins",
  "/admin/notifications/templates",
  "/admin/notifications/log",
  "/admin/notifications/routing",
  "/admin/notifications/alerts",
  BUILDER_PATH,
  REGIONS_PATH,
  COUNTRIES_PATH,
] as const;

const DEFAULT_LANDINGS = new Set(["/", "/clients", "/personnel"]);

export function isDefaultLanding(path: string): boolean {
  return DEFAULT_LANDINGS.has(pathOnly(path));
}

function pathOnly(path: string): string {
  return path.split(/[?#]/)[0] || "/";
}

export function accessState(session: AccessSession, path: string, probes: ProbeResults = {}): AccessState {
  const rule = ROUTE_RULES.find((candidate) => candidate.matches(pathOnly(path)));
  if (!rule) return "allowed";
  const hasAll = (rule.allOf ?? []).every((code) => sessionHasPermission(session, code));
  const hasAny = !rule.anyOf || rule.anyOf.some((code) => sessionHasPermission(session, code));
  if (!hasAll || !hasAny) return "denied";
  const query = new URLSearchParams(path.split("#")[0].split("?")[1] ?? "");
  const queryDenied = Object.entries(rule.queryRules ?? {}).some(
    ([param, codes]) => query.has(param) && !codes.some((code) => sessionHasPermission(session, code)),
  );
  if (queryDenied) return "denied";
  if (!rule.probe) return "allowed";
  const probed = probes[rule.probe];
  return probed === undefined ? "unknown" : probed ? "allowed" : "denied";
}

export function canAccessPath(session: AccessSession, path: string, probes: ProbeResults = {}): boolean {
  return accessState(session, path, probes) === "allowed";
}

export function firstAccessiblePath(session: AccessSession, probes: ProbeResults = {}): string | null {
  return START_PAGES.find((path) => canAccessPath(session, path, probes)) ?? null;
}

export function hasPendingAccess(session: AccessSession, probes: ProbeResults = {}): boolean {
  return START_PAGES.some((path) => accessState(session, path, probes) === "unknown");
}

export function hasRouteRule(path: string): boolean {
  return ROUTE_RULES.some((rule) => rule.matches(pathOnly(path)));
}

function isKnownRoute(path: string): boolean {
  const pathname = pathOnly(path);
  return START_PAGES.some((page) => page === pathname) || ROUTE_RULES.some((rule) => rule.matches(pathname));
}

export function landingPath(
  session: AccessSession,
  { returnTo, landingPage }: { returnTo?: string | null; landingPage?: string | null },
  probes: ProbeResults = {},
): string {
  const reachable = (path: string) => accessState(session, path, probes) !== "denied";
  const requested = safeInternalPath(returnTo);
  if (requested && reachable(requested)) return requested;
  const landing = safeInternalPath(landingPage);
  if (landing && isKnownRoute(landing) && reachable(landing)) return landing;
  return firstAccessiblePath(session, probes) ?? START_PAGES[0];
}
