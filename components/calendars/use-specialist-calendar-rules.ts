"use client";

import { useMemo } from "react";
import { PERMISSIONS, useHasPermission } from "@/lib/auth/permissions";
import {
  adminCalendarParameters,
  defaultCalendarParameters,
  resolveSpecialistParameters,
  useCalendarParameters,
  type RoleParameters,
} from "@/lib/calendars/parameters";
import type { Specialist } from "@/lib/specialists";
import { useIsClient } from "@/lib/use-is-client";

const SERVER_PARAMETERS = defaultCalendarParameters();

export function useSpecialistCalendarRules(
  specialist: Specialist,
  adminOverrides: boolean,
): { parameters: RoleParameters; rules: RoleParameters } {
  const hydrated = useIsClient();
  const stored = useCalendarParameters((state) => state.parameters);
  const storedCustom = useCalendarParameters((state) => state.specialistOverrides[specialist.id]);
  const storedFlags = useCalendarParameters((state) => state.adminSwitches[specialist.id]);
  const canOverride = useHasPermission(PERMISSIONS.TECHNICAL_EDIT);
  const global = hydrated ? stored : SERVER_PARAMETERS;
  const custom = hydrated ? storedCustom : undefined;
  const flags = hydrated ? storedFlags : undefined;
  const bypass = hydrated && adminOverrides && canOverride;
  const parameters = useMemo(
    () => resolveSpecialistParameters(global, specialist.role, custom),
    [global, specialist.role, custom],
  );
  const rules = useMemo(() => (bypass ? adminCalendarParameters(parameters, flags) : parameters), [bypass, parameters, flags]);
  return { parameters, rules };
}
