import { z } from "zod";

export type RoleMessages = { nameRequired: string };

export function roleSchema(msgs: RoleMessages) {
  return z.object({
    name: z.string().trim().min(1, msgs.nameRequired),
    description: z.string().trim(),
    is_active: z.boolean(),
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
  });
}
export type GrantForm = z.infer<ReturnType<typeof grantSchema>>;

export type OverlayMessages = { permissionRequired: string; duplicateOverlay: string };

export function overlaySchema(msgs: OverlayMessages, opts: { existingIds: string[] }) {
  return z.object({
    permissionId: z
      .string()
      .min(1, msgs.permissionRequired)
      .refine((id) => !opts.existingIds.includes(id), msgs.duplicateOverlay),
  });
}
export type OverlayForm = z.infer<ReturnType<typeof overlaySchema>>;
