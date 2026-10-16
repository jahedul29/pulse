import { useNotificationStore } from "./store";
import type { EventMapping } from "./types";

export async function fetchEventMappings(): Promise<EventMapping[]> {
  return useNotificationStore.getState().mappings;
}
