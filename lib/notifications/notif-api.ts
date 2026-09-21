import { apiData, apiFetch, apiList } from "@/lib/api/client";
import type { Paginated } from "@/lib/api/client";
import { ADMIN_IDENTITY } from "@/lib/api/config";
import { buildListQuery, listAll, type ListParams } from "@/lib/api/list-query";
import type {
  NotificationAlertRouteDto,
  NotificationCampaignDto,
  NotificationChannelDto,
  NotificationDeliveryDto,
  NotificationTemplateDto,
  StoreAlertRouteBody,
  StoreTemplateBody,
  UpdateAlertRouteBody,
  UpdateTemplateBody,
} from "./dto";

const TEMPLATES = `${ADMIN_IDENTITY}/notification-templates`;
const CHANNELS = `${ADMIN_IDENTITY}/notification-channels`;
const CAMPAIGNS = `${ADMIN_IDENTITY}/notification-campaigns`;
const DELIVERIES = `${ADMIN_IDENTITY}/notification-deliveries`;
const LIVE_ALERTS = `${ADMIN_IDENTITY}/notifications/live-alerts`;
const ALERT_ROUTES = `${ADMIN_IDENTITY}/notification-alert-routes`;

export type { ListParams };

export function listAllTemplates(): Promise<NotificationTemplateDto[]> {
  return listAll<NotificationTemplateDto>(TEMPLATES);
}

export async function listTemplates(params: ListParams = {}): Promise<Paginated<NotificationTemplateDto>> {
  const { data, meta } = await apiList<NotificationTemplateDto>(TEMPLATES, { query: buildListQuery(params) });
  return { data, meta };
}

export function getTemplate(id: number): Promise<NotificationTemplateDto> {
  return apiData<NotificationTemplateDto>(`${TEMPLATES}/${encodeURIComponent(String(id))}`);
}

export function createTemplate(body: StoreTemplateBody): Promise<NotificationTemplateDto> {
  return apiData<NotificationTemplateDto>(TEMPLATES, { method: "POST", body });
}

export function updateTemplate(id: number, body: UpdateTemplateBody): Promise<NotificationTemplateDto> {
  return apiData<NotificationTemplateDto>(`${TEMPLATES}/${encodeURIComponent(String(id))}`, {
    method: "PUT",
    body,
  });
}

export function deleteTemplate(id: number): Promise<unknown> {
  return apiFetch(`${TEMPLATES}/${encodeURIComponent(String(id))}`, { method: "DELETE" });
}

export function listAllChannels(): Promise<NotificationChannelDto[]> {
  return listAll<NotificationChannelDto>(CHANNELS);
}

export async function listChannels(params: ListParams = {}): Promise<Paginated<NotificationChannelDto>> {
  const { data, meta } = await apiList<NotificationChannelDto>(CHANNELS, { query: buildListQuery(params) });
  return { data, meta };
}

export async function listCampaigns(params: ListParams = {}): Promise<Paginated<NotificationCampaignDto>> {
  const { data, meta } = await apiList<NotificationCampaignDto>(CAMPAIGNS, { query: buildListQuery(params) });
  return { data, meta };
}

export async function listDeliveries(params: ListParams = {}): Promise<Paginated<NotificationDeliveryDto>> {
  const { data, meta } = await apiList<NotificationDeliveryDto>(DELIVERIES, {
    query: { ...buildListQuery(params), relations: ["template", "campaign"] },
  });
  return { data, meta };
}

export function getDelivery(id: string): Promise<NotificationDeliveryDto> {
  return apiData<NotificationDeliveryDto>(`${DELIVERIES}/${encodeURIComponent(id)}`, {
    query: { relations: ["channel", "template", "campaign"] },
  });
}

export interface LiveAlertsPage extends Paginated<NotificationDeliveryDto> {
  severityCounts: Record<string, number>;
}

export async function listLiveAlerts(params: ListParams = {}): Promise<LiveAlertsPage> {
  const { data, meta, info } = await apiList<NotificationDeliveryDto>(LIVE_ALERTS, {
    query: { ...buildListQuery(params), relations: ["template", "campaign"] },
  });
  const severityCounts = (info as { severity_counts?: Record<string, number> } | null)?.severity_counts ?? {};
  return { data, meta, severityCounts };
}

export async function listAlertRoutes(params: ListParams = {}): Promise<Paginated<NotificationAlertRouteDto>> {
  const { data, meta } = await apiList<NotificationAlertRouteDto>(ALERT_ROUTES, {
    query: { ...buildListQuery(params), relations: ["channel", "template"] },
  });
  return { data, meta };
}

export function getAlertRoute(id: number): Promise<NotificationAlertRouteDto> {
  return apiData<NotificationAlertRouteDto>(`${ALERT_ROUTES}/${encodeURIComponent(String(id))}`, {
    query: { relations: ["channel", "template"] },
  });
}

export function createAlertRoute(body: StoreAlertRouteBody): Promise<NotificationAlertRouteDto> {
  return apiData<NotificationAlertRouteDto>(ALERT_ROUTES, { method: "POST", body });
}

export function updateAlertRoute(id: number, body: UpdateAlertRouteBody): Promise<NotificationAlertRouteDto> {
  return apiData<NotificationAlertRouteDto>(`${ALERT_ROUTES}/${encodeURIComponent(String(id))}`, {
    method: "PUT",
    body,
  });
}

export function deleteAlertRoute(id: number): Promise<unknown> {
  return apiFetch(`${ALERT_ROUTES}/${encodeURIComponent(String(id))}`, { method: "DELETE" });
}
