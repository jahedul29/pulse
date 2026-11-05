import type { LocalizedText, NotificationTemplateDto, StoreTemplateBody, TemplateType, UpdateTemplateBody } from "./dto";
import type { TemplateForm } from "./schemas";
import { cleanTemplateBodyHtml, isTemplateHtml } from "./sanitize";
import { htmlToPlainText, plainTextToHtml } from "./variables";

export const DEFAULT_SENDER_NAME = "ABAPRO";
export const DEFAULT_BUTTON_LABEL: Required<LocalizedText> = { EN: "OK", AR: "حسناً" };

export const EMPTY_TEMPLATE_FORM: TemplateForm = {
  code: "",
  name: "",
  type: "NOTIFICATION",
  channelId: "",
  icon: "",
  senderName: DEFAULT_SENDER_NAME,
  headerTitleEn: "",
  headerTitleAr: "",
  headerSubtitleEn: "",
  headerSubtitleAr: "",
  subjectEn: "",
  subjectAr: "",
  bodyEn: "",
  bodyAr: "",
  buttonLabelEn: DEFAULT_BUTTON_LABEL.EN,
  buttonLabelAr: DEFAULT_BUTTON_LABEL.AR,
  isActive: true,
};

export function templateType(template: Pick<NotificationTemplateDto, "type">): TemplateType {
  return template.type === "POPUP" ? "POPUP" : "NOTIFICATION";
}

function bodyHtml(body: string | undefined): string {
  if (!body) return "";
  return isTemplateHtml(body) ? body : plainTextToHtml(body);
}

export function isLegacyTemplate(template: NotificationTemplateDto): boolean {
  return templateType(template) === "NOTIFICATION" && !template.header_title?.EN;
}

export function templateToForm(template: NotificationTemplateDto): TemplateForm {
  const type = templateType(template);
  const buttonLabel = template.button_label ?? DEFAULT_BUTTON_LABEL;
  return {
    code: template.code,
    name: template.name,
    type,
    channelId: String(template.channel_id),
    icon: template.icon ?? "",
    senderName: template.sender_name ?? (type === "NOTIFICATION" ? DEFAULT_SENDER_NAME : ""),
    headerTitleEn: template.header_title?.EN ?? "",
    headerTitleAr: template.header_title?.AR ?? "",
    headerSubtitleEn: template.header_subtitle?.EN ?? "",
    headerSubtitleAr: template.header_subtitle?.AR ?? "",
    subjectEn: template.subject?.EN ?? "",
    subjectAr: template.subject?.AR ?? "",
    bodyEn: bodyHtml(template.body?.EN),
    bodyAr: bodyHtml(template.body?.AR),
    buttonLabelEn: buttonLabel.EN ?? "",
    buttonLabelAr: buttonLabel.AR ?? "",
    isActive: template.is_active,
  };
}

function localized(english: string, arabic: string): LocalizedText | null {
  const text: LocalizedText = {
    ...(english.trim() ? { EN: english.trim() } : {}),
    ...(arabic.trim() ? { AR: arabic.trim() } : {}),
  };
  return Object.keys(text).length ? text : null;
}

export function templateUpdateBody(values: TemplateForm): UpdateTemplateBody {
  const notification = values.type === "NOTIFICATION";
  return {
    name: values.name,
    type: values.type,
    channel_id: Number(values.channelId),
    icon: notification ? values.icon || null : null,
    sender_name: notification ? values.senderName.trim() || null : null,
    header_title: notification ? localized(values.headerTitleEn, values.headerTitleAr) : null,
    header_subtitle: notification ? localized(values.headerSubtitleEn, values.headerSubtitleAr) : null,
    subject: notification ? localized(values.subjectEn, values.subjectAr) : null,
    body: {
      EN: cleanTemplateBodyHtml(values.bodyEn),
      ...(htmlToPlainText(values.bodyAr).trim() ? { AR: cleanTemplateBodyHtml(values.bodyAr) } : {}),
    },
    button_label: localized(values.buttonLabelEn, values.buttonLabelAr),
    is_active: values.isActive,
  };
}

export function templateCreateBody(values: TemplateForm): StoreTemplateBody {
  return { code: values.code, ...templateUpdateBody(values) };
}
