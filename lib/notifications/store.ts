import { create } from "zustand";
import { seedMappings, seedTemplates } from "./mock";
import type { EventMapping, MessageTemplate } from "./types";

interface NotificationState {
  templates: MessageTemplate[];
  mappings: EventMapping[];
  setMapping: (mapping: EventMapping) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  templates: seedTemplates(),
  mappings: seedMappings(),

  setMapping: (mapping) =>
    set((state) => ({
      mappings: state.mappings.map((existing) => (existing.eventId === mapping.eventId ? mapping : existing)),
    })),
}));
