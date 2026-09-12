import { z } from "zod";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type InviteMessages = {
  staffRequired: string;
  emailRequired: string;
  emailInvalid: string;
  roleRequired: string;
};

export function inviteSchema(messages: InviteMessages) {
  return z.object({
    staffId: z.string().min(1, messages.staffRequired),
    email: z
      .string()
      .trim()
      .min(1, messages.emailRequired)
      .refine((email) => EMAIL_RE.test(email), messages.emailInvalid),
    roleIds: z.array(z.string()).min(1, messages.roleRequired),
  });
}

export type InviteForm = z.infer<ReturnType<typeof inviteSchema>>;
