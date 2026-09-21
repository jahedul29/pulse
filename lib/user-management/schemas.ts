import { z } from "zod";

export type InviteMessages = {
  staffRequired: string;
  roleRequired: string;
};

export function inviteSchema(messages: InviteMessages) {
  return z.object({
    staffId: z.string().min(1, messages.staffRequired),
    email: z.string(),
    roleIds: z.array(z.string()).min(1, messages.roleRequired),
  });
}

export type InviteForm = z.infer<ReturnType<typeof inviteSchema>>;
