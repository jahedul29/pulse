import { z } from "zod";
import { htmlToPlainText } from "./variables";
import { AUDIENCE_TYPES, type AudienceType } from "./dto";
import { RECIPIENT_ROLES } from "./types";
import type { RecipientRole } from "./types";

const AUDIENCE = AUDIENCE_TYPES as [AudienceType, ...AudienceType[]];

const nonEmptyHtml = (html: string) => htmlToPlainText(html).trim().length > 0;

export type TemplateMessages = {
  codeRequired: string;
  codeFormat: string;
  nameRequired: string;
  channelRequired: string;
  subjectRequired: string;
  bodyRequired: string;
};

export function templateSchema(msgs: TemplateMessages, opts: { isCreate: boolean }) {
  const code = opts.isCreate
    ? z.string().trim().min(1, msgs.codeRequired).regex(/^[A-Z0-9_]+$/, msgs.codeFormat)
    : z.string();
  return z.object({
    code,
    name: z.string().trim().min(1, msgs.nameRequired),
    channelId: z.string().min(1, msgs.channelRequired),
    subjectEn: z.string().trim().min(1, msgs.subjectRequired),
    subjectAr: z.string().trim(),
    bodyEn: z.string().refine(nonEmptyHtml, msgs.bodyRequired),
    bodyAr: z.string(),
    isActive: z.boolean(),
  });
}
export type TemplateForm = z.infer<ReturnType<typeof templateSchema>>;

export type AlertRouteMessages = {
  codeRequired: string;
  codeFormat: string;
  nameRequired: string;
  channelRequired: string;
  templateRequired: string;
  audienceRequired: string;
  priorityInvalid: string;
};

export function alertRouteSchema(msgs: AlertRouteMessages, opts: { isCreate: boolean }) {
  const code = opts.isCreate
    ? z.string().trim().min(1, msgs.codeRequired).regex(/^[A-Z0-9_]+$/, msgs.codeFormat)
    : z.string();
  return z
    .object({
      code,
      name: z.string().trim().min(1, msgs.nameRequired),
      channelId: z.string().min(1, msgs.channelRequired),
      templateId: z.string().min(1, msgs.templateRequired),
      audienceType: z.enum(AUDIENCE),
      audienceIds: z.array(z.string()),
      priority: z.number({ error: msgs.priorityInvalid }).int(msgs.priorityInvalid).min(0, msgs.priorityInvalid),
      isActive: z.boolean(),
    })
    .refine(
      (value) => value.audienceType === "ALL_ADMINS" || value.audienceIds.length > 0,
      { message: msgs.audienceRequired, path: ["audienceIds"] },
    );
}
export type AlertRouteForm = z.infer<ReturnType<typeof alertRouteSchema>>;

const recipients = z.object(
  RECIPIENT_ROLES.reduce(
    (accumulator, role) => ({ ...accumulator, [role]: z.boolean() }),
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
    .superRefine((value, ctx) => {
      for (const role of RECIPIENT_ROLES) {
        if (value.recipients[role] && !value.templateByRole[role]) {
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
