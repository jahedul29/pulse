import { z } from "zod";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type InviteMessages = {
  staffRequired: string;
  emailRequired: string;
  emailInvalid: string;
  emailExists: string;
  roleRequired: string;
};

export function inviteSchema(msgs: InviteMessages, opts: { existingEmails: string[] }) {
  const taken = opts.existingEmails.map((e) => e.trim().toLowerCase());
  return z.object({
    staffId: z.string().min(1, msgs.staffRequired),
    email: z
      .string()
      .trim()
      .min(1, msgs.emailRequired)
      .refine((e) => EMAIL_RE.test(e), msgs.emailInvalid)
      .refine((e) => !taken.includes(e.toLowerCase()), msgs.emailExists),
    roleIds: z.array(z.string()).min(1, msgs.roleRequired),
  });
}

export type InviteForm = z.infer<ReturnType<typeof inviteSchema>>;
