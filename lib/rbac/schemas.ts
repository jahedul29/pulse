import { z } from "zod";
import { MODULE_IDS } from "./modules";
import type { ModuleId, PermissionAction } from "./types";

const MODULE = MODULE_IDS as [ModuleId, ...ModuleId[]];
const ACTION = ["view", "edit"] as [PermissionAction, ...PermissionAction[]];

export type RoleMessages = { nameRequired: string; nameExists: string };

export function roleSchema(msgs: RoleMessages, opts: { existingNames: string[] }) {
  const taken = opts.existingNames.map((n) => n.trim().toLowerCase());
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, msgs.nameRequired)
      .refine((n) => !taken.includes(n.toLowerCase()), msgs.nameExists),
    description: z.string().trim(),
  });
}
export type RoleForm = z.infer<ReturnType<typeof roleSchema>>;

export type GrantMessages = { roleRequired: string; duplicateRole: string };

export function grantSchema(msgs: GrantMessages, opts: { existingRoleIds: string[] }) {
  return z.object({
    roleId: z
      .string()
      .min(1, msgs.roleRequired)
      .refine((id) => !opts.existingRoleIds.includes(id), msgs.duplicateRole),
    expiresAt: z.number().nullable(),
  });
}
export type GrantForm = z.infer<ReturnType<typeof grantSchema>>;

export function overlaySchema(msgs: { duplicateOverlay: string }, opts: { existingKeys: string[] }) {
  return z
    .object({
      moduleId: z.enum(MODULE),
      action: z.enum(ACTION),
    })
    .refine((v) => !opts.existingKeys.includes(`${v.moduleId}:${v.action}`), {
      message: msgs.duplicateOverlay,
      path: ["action"],
    });
}
export type OverlayForm = z.infer<ReturnType<typeof overlaySchema>>;
