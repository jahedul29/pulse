import { create } from "zustand";
import { seedMappings, seedRouting, seedTemplates } from "./mock";
import type { AlertRouting, EventMapping, MessageTemplate } from "./types";

interface NotificationState {
  templates: MessageTemplate[];
  mappings: EventMapping[];
  routing: AlertRouting[];
  upsertTemplate: (template: Omit<MessageTemplate, "updatedAt">) => void;
  deleteTemplate: (code: string) => void;
  setMapping: (mapping: EventMapping) => void;
  setRouting: (routing: AlertRouting) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  templates: seedTemplates(),
  mappings: seedMappings(),
  routing: seedRouting(),

  upsertTemplate: (template) =>
    set((s) => {
      const record = { ...template, updatedAt: Date.now() };
      const exists = s.templates.some((t) => t.code === record.code);
      return {
        templates: exists
          ? s.templates.map((t) => (t.code === record.code ? record : t))
          : [...s.templates, record],
      };
    }),

  deleteTemplate: (code) =>
    set((s) => ({ templates: s.templates.filter((t) => t.code !== code) })),

  setMapping: (mapping) =>
    set((s) => ({ mappings: s.mappings.map((m) => (m.eventId === mapping.eventId ? mapping : m)) })),

  setRouting: (routing) =>
    set((s) => ({ routing: s.routing.map((r) => (r.eventId === routing.eventId ? routing : r)) })),
}));
