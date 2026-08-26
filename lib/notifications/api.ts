import { useNotificationStore } from "./store";
import { seedLiveAlerts, seedLog } from "./mock";
import type {
  AlertRouting,
  EventMapping,
  LiveAlert,
  MessageTemplate,
  NotificationLogEntry,
  NotificationLogQuery,
} from "./types";

const LOG = seedLog();
const LIVE = seedLiveAlerts();

export async function fetchTemplates(): Promise<MessageTemplate[]> {
  return [...useNotificationStore.getState().templates].sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function fetchTemplateDetail(code: string): Promise<MessageTemplate | null> {
  return useNotificationStore.getState().templates.find((t) => t.code === code) ?? null;
}

export async function fetchEventMappings(): Promise<EventMapping[]> {
  return useNotificationStore.getState().mappings;
}

export async function fetchAlertRouting(): Promise<AlertRouting[]> {
  return useNotificationStore.getState().routing;
}

export async function fetchNotificationLog(
  query: NotificationLogQuery = {},
): Promise<NotificationLogEntry[]> {
  const { dateFrom, dateTo, roles, categories, statuses } = query;
  return LOG.filter((n) => dateFrom == null || n.createdAt >= dateFrom)
    .filter((n) => dateTo == null || n.createdAt <= dateTo)
    .filter((n) => !roles || roles.length === 0 || roles.includes(n.recipientRole))
    .filter((n) => !categories || categories.length === 0 || categories.includes(n.category))
    .filter((n) => !statuses || statuses.length === 0 || statuses.includes(n.status))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function fetchLiveAlerts(): Promise<LiveAlert[]> {
  return [...LIVE].sort((a, b) => b.firedAt - a.firedAt);
}
