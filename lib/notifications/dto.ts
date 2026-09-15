import type { Tone } from "@/components/common/status-badge";

export type LocalizedText = { EN?: string; AR?: string };

export type AudienceType = "ALL_ADMINS" | "ROLE" | "USER_IDS";
export const AUDIENCE_TYPES: AudienceType[] = ["ALL_ADMINS", "ROLE", "USER_IDS"];

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
  channel_id: number;
  subject: LocalizedText;
  body: LocalizedText;
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
  admin_account_id: string | null;
  status: DeliveryStatusCode;
  error_message: string | null;
  sent_at: string | null;
  created_at: string | null;
  channel?: NotificationChannelDto | null;
  template?: NotificationTemplateDto | null;
  campaign?: NotificationCampaignDto | null;
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
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  channel?: NotificationChannelDto | null;
  template?: NotificationTemplateDto | null;
}

export interface StoreTemplateBody {
  code: string;
  name: string;
  channel_id: number;
  subject: LocalizedText;
  body: LocalizedText;
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
