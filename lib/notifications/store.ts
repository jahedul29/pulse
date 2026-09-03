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
    set((state) => {
      const record = { ...template, updatedAt: Date.now() };
      const exists = state.templates.some((existing) => existing.code === record.code);
      return {
        templates: exists
          ? state.templates.map((existing) => (existing.code === record.code ? record : existing))
          : [...state.templates, record],
      };
    }),

  deleteTemplate: (code) =>
    set((state) => ({ templates: state.templates.filter((existing) => existing.code !== code) })),

  setMapping: (mapping) =>
    set((state) => ({
      mappings: state.mappings.map((existing) => (existing.eventId === mapping.eventId ? mapping : existing)),
    })),

  setRouting: (routing) =>
    set((state) => ({
      routing: state.routing.map((existing) => (existing.eventId === routing.eventId ? routing : existing)),
    })),
}));
