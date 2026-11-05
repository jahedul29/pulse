import type { Tone } from "@/components/common/status-badge";

export type LocalizedText = { EN?: string; AR?: string };

export type AudienceType = "ALL_ADMINS" | "ROLE" | "USER_IDS";
export const AUDIENCE_TYPES: AudienceType[] = ["ALL_ADMINS", "ROLE", "USER_IDS"];

export type TemplateType = "NOTIFICATION" | "POPUP";
export const TEMPLATE_TYPES: TemplateType[] = ["NOTIFICATION", "POPUP"];

export const TEMPLATE_ICONS = [
  "user_paused",
  "certificate",
  "user",
  "user_alert",
  "user_check",
  "user_blocked",
  "user_arrow_up",
  "user_star",
] as const;
export type TemplateIcon = (typeof TEMPLATE_ICONS)[number];

export function isTemplateIcon(icon: string | null | undefined): icon is TemplateIcon {
  return (TEMPLATE_ICONS as readonly string[]).includes(icon ?? "");
}

export const TEMPLATE_ACTIONS = [
  "verify_email",
  "verify_mobile",
  "open_experience_center",
  "open_terms_of_service",
  "open_privacy_policy",
  "open_payment_cancellation_policy",
  "open_session_schedule",
  "open_account_status",
] as const;
export type TemplateAction = (typeof TEMPLATE_ACTIONS)[number];

export type DeliveryStatusCode = "PENDING" | "SENT" | "FAILED";
export const DELIVERY_STATUS_CODES: DeliveryStatusCode[] = ["PENDING", "SENT", "FAILED"];

export interface NotificationChannelDto {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
  config?: unknown;
  created_at?: string;
}

export interface NotificationTemplateDto {
  id: number;
  code: string;
  name: string;
  type?: TemplateType | null;
  channel_id: number;
  icon?: string | null;
  sender_name?: string | null;
  header_title?: LocalizedText | null;
  header_subtitle?: LocalizedText | null;
  subject: LocalizedText | null;
  body: LocalizedText;
  button_label?: LocalizedText | null;
  is_active: boolean;
  created_at?: string;
  channel?: NotificationChannelDto | null;
}

export interface NotificationCampaignDto {
  id: string;
  name: string;
  status?: string;
  channel_id?: number;
  template_id?: number | null;
  created_at?: string;
}

export interface NotificationDeliveryDto {
  id: string;
  template_id: number | null;
  channel_id: number | null;
  campaign_id: string | null;
  alert_route_id: string | number | null;
  admin_account_id: string | null;
  status: DeliveryStatusCode;
  title: string | null;
  body: string | null;
  severity: string | null;
  severity_color: string | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string | null;
  channel?: NotificationChannelDto | null;
  template?: NotificationTemplateDto | null;
  campaign?: NotificationCampaignDto | null;
  alert_route?: { id: number; code?: string | null; name?: string | null } | null;
  admin_account?: {
    id: string;
    email?: string | null;
    full_name?: string | null;
    username?: string | null;
    staff_id?: number | null;
    staff?: { first_name?: string | null; last_name?: string | null; nickname?: string | null } | null;
  } | null;
}

export type AudienceFilter = { role_ids?: number[]; user_ids?: string[] } | unknown[] | null;

export interface NotificationAlertRouteDto {
  id: number;
  code: string;
  name: string;
  channel_id: number;
  template_id: number | null;
  audience_type: AudienceType;
  audience_filter: AudienceFilter;
  priority: number;
  severity?: string | null;
  severity_color?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  channel?: NotificationChannelDto | null;
  template?: NotificationTemplateDto | null;
}

export interface StoreTemplateBody {
  code: string;
  name: string;
  type: TemplateType;
  channel_id: number;
  icon: string | null;
  sender_name: string | null;
  header_title: LocalizedText | null;
  header_subtitle: LocalizedText | null;
  subject: LocalizedText | null;
  body: LocalizedText;
  button_label: LocalizedText | null;
  is_active: boolean;
}

export type UpdateTemplateBody = Omit<StoreTemplateBody, "code">;

export interface StoreAlertRouteBody {
  code: string;
  name: string;
  channel_id: number;
  template_id: number | null;
  audience_type: AudienceType;
  audience_filter: { role_ids?: number[]; user_ids?: string[] } | never[];
  priority: number;
  severity: DeliverySeverityCode;
  is_active: boolean;
}

export type UpdateAlertRouteBody = Omit<StoreAlertRouteBody, "code">;

export function localizedText(text: LocalizedText | null | undefined, locale: string): string {
  if (!text) return "";
  const key = locale.toLowerCase().startsWith("ar") ? "AR" : "EN";
  return text[key] ?? text.EN ?? text.AR ?? "";
}

export function normalizeAudienceFilter(filter: AudienceFilter): {
  role_ids: number[];
  user_ids: string[];
} {
  if (!filter || Array.isArray(filter)) return { role_ids: [], user_ids: [] };
  const record = filter as { role_ids?: number[]; user_ids?: string[] };
  return { role_ids: record.role_ids ?? [], user_ids: record.user_ids ?? [] };
}

export function buildAudienceFilter(
  audienceType: AudienceType,
  ids: string[],
): { role_ids?: number[]; user_ids?: string[] } | never[] {
  if (audienceType === "ROLE") return { role_ids: ids.map(Number) };
  if (audienceType === "USER_IDS") return { user_ids: ids };
  return [];
}

export function audienceCount(route: NotificationAlertRouteDto): number | null {
  if (route.audience_type === "ALL_ADMINS") return null;
  const { role_ids, user_ids } = normalizeAudienceFilter(route.audience_filter);
  return route.audience_type === "ROLE" ? role_ids.length : user_ids.length;
}

export function deliveryStatusTone(status: DeliveryStatusCode): Tone {
  if (status === "SENT") return "success";
  if (status === "FAILED") return "danger";
  return "warning";
}

export type DeliverySeverityCode = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export const SEVERITY_ORDER: DeliverySeverityCode[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

export function isSeverityCode(value: string | null | undefined): value is DeliverySeverityCode {
  return SEVERITY_ORDER.includes(value as DeliverySeverityCode);
}

export function severityTone(severity: string | null | undefined): Tone {
  if (severity === "CRITICAL" || severity === "HIGH") return "danger";
  if (severity === "MEDIUM") return "warning";
  if (severity === "LOW") return "success";
  return "neutral";
}

export function shortId(value: string | null): string {
  if (!value) return "-";
  return value.length > 10 ? `${value.slice(0, 8)}…` : value;
}

export function recipientName(entry: NotificationDeliveryDto): string {
  const account = entry.admin_account;
  const staff = account?.staff;
  const full =
    account?.full_name?.trim() || (staff ? `${staff.first_name ?? ""} ${staff.last_name ?? ""}`.trim() : "");
  return full || account?.email || shortId(entry.admin_account_id);
}
