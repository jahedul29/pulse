"use client";

import { useEffect } from "react";
import { sessionOwner, useAuthStore } from "@/lib/auth/store";
import { CALENDAR_PARAMETERS_STORAGE_KEY, useCalendarParameters } from "@/lib/calendars/parameters";

export function CalendarParametersSync() {
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === CALENDAR_PARAMETERS_STORAGE_KEY) void useCalendarParameters.persist.rehydrate();
    };
    const unsubscribe = useAuthStore.subscribe((state, previous) => {
      if (sessionOwner(state.session) !== sessionOwner(previous.session)) {
        useCalendarParameters.getState().clearRuleSwitches();
      }
    });
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      unsubscribe();
    };
  }, []);

  return null;
}
