import { z } from "zod";
import { htmlToPlainText } from "./variables";
import { MESSAGE_CATEGORIES, RECIPIENT_ROLES, URGENCIES } from "./types";
import type { MessageCategory, RecipientRole, Urgency } from "./types";

const CATEGORY = MESSAGE_CATEGORIES as [MessageCategory, ...MessageCategory[]];
const URGENCY = URGENCIES as [Urgency, ...Urgency[]];

const nonEmptyHtml = (html: string) => htmlToPlainText(html).trim().length > 0;

export type TemplateMessages = {
  codeRequired: string;
  codeFormat: string;
  codeExists: string;
  enRequired: string;
  arRequired: string;
};

export function templateSchema(
  msgs: TemplateMessages,
  opts: { existingCodes: string[]; isCreate: boolean },
) {
  const code = opts.isCreate
    ? z
        .string()
        .trim()
        .min(1, msgs.codeRequired)
        .regex(/^[A-Z0-9_]+$/, msgs.codeFormat)
        .refine((codeValue) => !opts.existingCodes.includes(codeValue), msgs.codeExists)
    : z.string();
  return z.object({
    code,
    category: z.enum(CATEGORY),
    en: z.string().refine(nonEmptyHtml, msgs.enRequired),
    ar: z.string().refine(nonEmptyHtml, msgs.arRequired),
  });
}
export type TemplateForm = z.infer<ReturnType<typeof templateSchema>>;

const recipients = z.object(
  RECIPIENT_ROLES.reduce(
    (acc, role) => ({ ...acc, [role]: z.boolean() }),
    {} as Record<RecipientRole, z.ZodBoolean>,
  ),
);

export function mappingSchema(msgs: { templateRequired: string }) {
  return z
    .object({
      eventId: z.string(),
      eventName: z.string(),
      recipients,
      templateByRole: z.record(z.string(), z.string().optional()),
    })
    .superRefine((val, ctx) => {
      for (const role of RECIPIENT_ROLES) {
        if (val.recipients[role] && !val.templateByRole[role]) {
          ctx.addIssue({
            code: "custom",
            message: msgs.templateRequired,
            path: ["templateByRole", role],
          });
        }
      }
    });
}
export type MappingForm = z.infer<ReturnType<typeof mappingSchema>>;

export function routingSchema(msgs: { recipientRequired: string }) {
  return z
    .object({
      eventId: z.string(),
      eventName: z.string(),
      recipients,
      generatesTicket: z.boolean(),
      urgency: z.enum(URGENCY),
    })
    .refine((val) => RECIPIENT_ROLES.some((role) => val.recipients[role]), {
      message: msgs.recipientRequired,
      path: ["recipients"],
    });
}
export type RoutingForm = z.infer<ReturnType<typeof routingSchema>>;
