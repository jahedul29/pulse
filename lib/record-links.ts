import { countryRegionsHref, regionHref } from "@/lib/locations/routes";

export type RecordKind =
  | "adminAccount"
  | "invitation"
  | "role"
  | "securityPolicy"
  | "template"
  | "alertRoute"
  | "actionLog"
  | "region"
  | "country";

export type ReferenceKind = "admin" | "adminList" | "roles" | "template" | "alertRoute" | "channel" | "region" | "country";

const TABLE_KIND: Record<string, RecordKind> = {
  admin_accounts: "adminAccount",
  admin_invitations: "invitation",
  roles: "role",
  security_policies: "securityPolicy",
  notification_templates: "template",
  notification_alert_routes: "alertRoute",
};

const TARGET_KIND: Record<string, RecordKind> = {
  ADMIN_ACCOUNT: "adminAccount",
  USERS: "adminAccount",
  INVITATIONS: "invitation",
  ROLES: "role",
  SECURITY_POLICY: "securityPolicy",
  NOTIFICATION_TEMPLATES: "template",
  NOTIFICATION_ALERT_ROUTES: "alertRoute",
  CITIES: "region",
  COUNTRIES: "country",
};

const REFERENCE_KIND: [RegExp, ReferenceKind][] = [
  [/^(admin_account_id|actor_admin_id|[a-z_]*_by_admin_id)$/, "admin"],
  [/^user_ids$/, "adminList"],
  [/^(proposed_)?role_ids?$/, "roles"],
  [/^template_id$/, "template"],
  [/^alert_route_id$/, "alertRoute"],
  [/^channel_id$/, "channel"],
  [/^city_id$/, "region"],
  [/^country_id$/, "country"],
];

const HTTP_ROUTE = /^(GET|POST|PUT|PATCH|DELETE)\s+\S+$/;
const DB_DATETIME = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/;

export function tableRecordKind(table: string | null | undefined): RecordKind | null {
  return (table && TABLE_KIND[table]) || null;
}

export function targetRecordKind(targetType: string | null | undefined): RecordKind | null {
  return (targetType && TARGET_KIND[targetType]) || null;
}

export function recordHref(kind: RecordKind, id: string | number): string {
  const encoded = encodeURIComponent(String(id));
  if (kind === "adminAccount") return `/admin/user-management?open=${encoded}`;
  if (kind === "invitation") return `/admin/user-management?invite=${encoded}`;
  if (kind === "role") return `/admin/roles/${encoded}`;
  if (kind === "template") return `/admin/notifications/templates?open=${encoded}`;
  if (kind === "alertRoute") return `/admin/notifications/routing?open=${encoded}`;
  if (kind === "actionLog") return `/admin/audit/actions?open=${encoded}`;
  if (kind === "region") return regionHref(id);
  if (kind === "country") return countryRegionsHref(id);
  return "/admin/settings/security";
}

export function referenceKind(key: string): ReferenceKind | null {
  const leaf = key.split(".").pop()?.replace(/\[\d+\]$/, "") ?? key;
  return REFERENCE_KIND.find(([pattern]) => pattern.test(leaf))?.[1] ?? null;
}

export function isHttpRoute(value: string | null | undefined): boolean {
  return Boolean(value && HTTP_ROUTE.test(value.trim()));
}

export function parseIdList(value: string): string[] {
  const trimmed = value.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map((item) => String(item)).filter(Boolean);
    } catch {
      void 0;
    }
  }
  return trimmed
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function dbDateTimeToEpoch(value: string): number | null {
  const trimmed = value.trim();
  if (!DB_DATETIME.test(trimmed)) return null;
  const iso = trimmed.replace(" ", "T");
  const parsed = Date.parse(/(Z|[+-]\d{2}:?\d{2})$/.test(iso) ? iso : `${iso}Z`);
  return Number.isNaN(parsed) ? null : parsed;
}
