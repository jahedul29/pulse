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
  return [...useNotificationStore.getState().templates].sort(
    (templateA, templateB) => templateB.updatedAt - templateA.updatedAt,
  );
}

export async function fetchTemplateDetail(code: string): Promise<MessageTemplate | null> {
  return useNotificationStore.getState().templates.find((template) => template.code === code) ?? null;
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
  return LOG.filter((entry) => dateFrom == null || entry.createdAt >= dateFrom)
    .filter((entry) => dateTo == null || entry.createdAt <= dateTo)
    .filter((entry) => !roles || roles.length === 0 || roles.includes(entry.recipientRole))
    .filter((entry) => !categories || categories.length === 0 || categories.includes(entry.category))
    .filter((entry) => !statuses || statuses.length === 0 || statuses.includes(entry.status))
    .sort((entryA, entryB) => entryB.createdAt - entryA.createdAt);
}

export async function fetchLiveAlerts(): Promise<LiveAlert[]> {
  return [...LIVE].sort((alertA, alertB) => alertB.firedAt - alertA.firedAt);
}
