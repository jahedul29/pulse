import type { ModuleMeta, ModuleId, RolePermissions } from "./types";

export const MODULES: ModuleMeta[] = [
  { id: "dashboard", labelKey: "mod_dashboard", sensitivity: [] },
  { id: "events", labelKey: "mod_events", sensitivity: [] },
  { id: "technical", labelKey: "mod_technical", sensitivity: [] },
  { id: "clients", labelKey: "mod_clients", sensitivity: ["pii"] },
  { id: "specialists", labelKey: "mod_specialists", sensitivity: ["pii"] },
  { id: "discounts", labelKey: "mod_discounts", sensitivity: ["financial"] },
  { id: "orders", labelKey: "mod_orders", sensitivity: ["financial"] },
  { id: "financial", labelKey: "mod_financial", sensitivity: ["financial"] },
  { id: "clientsReferral", labelKey: "mod_clientsReferral", sensitivity: ["financial"] },
  { id: "specialistsReferral", labelKey: "mod_specialistsReferral", sensitivity: ["financial"] },
  { id: "services", labelKey: "mod_services", sensitivity: [] },
  { id: "notifications", labelKey: "mod_notifications", sensitivity: [] },
  { id: "content", labelKey: "mod_content", sensitivity: ["destructive"] },
  { id: "personnel", labelKey: "mod_personnel", sensitivity: ["pii"] },
  { id: "userManagement", labelKey: "mod_userManagement", sensitivity: ["pii", "destructive"] },
];

export const MODULE_IDS: ModuleId[] = MODULES.map((module) => module.id);

export function emptyPermissions(): RolePermissions {
  return MODULE_IDS.reduce((acc, id) => {
    acc[id] = { view: false, edit: false };
    return acc;
  }, {} as RolePermissions);
}

export function fullPermissions(): RolePermissions {
  return MODULE_IDS.reduce((acc, id) => {
    acc[id] = { view: true, edit: true };
    return acc;
  }, {} as RolePermissions);
}

export function permissionsFrom(
  view: ModuleId[],
  edit: ModuleId[] = [],
): RolePermissions {
  const base = emptyPermissions();
  view.forEach((id) => (base[id].view = true));
  edit.forEach((id) => {
    base[id].view = true;
    base[id].edit = true;
  });
  return base;
}

export function countGranted(permissions: RolePermissions): { view: number; edit: number } {
  let view = 0;
  let edit = 0;
  MODULE_IDS.forEach((id) => {
    if (permissions[id].view) view++;
    if (permissions[id].edit) edit++;
  });
  return { view, edit };
}
