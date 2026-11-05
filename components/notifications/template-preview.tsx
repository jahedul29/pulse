"use client";

import { useMemo, type ReactNode } from "react";
import { createTranslator, useTranslations } from "next-intl";
import { Award, Bell, User, UserCheck, UserLock, UserMinus, UserPlus, UserStar, UserX, type LucideIcon } from "lucide-react";
import { MESSAGES } from "@/lib/i18n/messages";
import { enFallback } from "@/lib/i18n/fallback";
import { TemplateHtml } from "@/components/notifications/template-html";
import { templateType } from "@/lib/notifications/templates";
import { isTemplateIcon, type NotificationTemplateDto, type TemplateIcon } from "@/lib/notifications/dto";

type Language = "EN" | "AR";

function appTranslator(language: Language) {
  const locale = language === "AR" ? "ar" : "en";
  return createTranslator({
    locale,
    messages: MESSAGES[locale],
    namespace: "notifications.templates",
    onError: () => undefined,
    getMessageFallback: ({ namespace, key }) => enFallback(namespace, key),
  });
}

const ICONS: Record<TemplateIcon, LucideIcon> = {
  user_paused: UserMinus,
  certificate: Award,
  user: User,
  user_alert: UserLock,
  user_check: UserCheck,
  user_blocked: UserX,
  user_arrow_up: UserPlus,
  user_star: UserStar,
};

export function TemplateIconGlyph({ icon, className }: { icon: string | null | undefined; className?: string }) {
  const Icon = isTemplateIcon(icon) ? ICONS[icon] : Bell;
  return <Icon aria-hidden className={className} />;
}

function PreviewLabel({ children }: { children: ReactNode }) {
  return <span className="text-xs font-medium text-muted-foreground">{children}</span>;
}

function Missing({ children }: { children: ReactNode }) {
  return <span className="font-normal text-muted-foreground italic">{children}</span>;
}

function PreviewButton({ label }: { label: string }) {
  return (
    <div className="mt-4 flex">
      <span className="inline-flex h-10 min-w-24 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground">
        {label}
      </span>
    </div>
  );
}

type PreviewTemplate = Pick<
  NotificationTemplateDto,
  "type" | "icon" | "sender_name" | "header_title" | "header_subtitle" | "subject" | "body" | "button_label"
>;

export function TemplatePreview({ template, language }: { template: PreviewTemplate; language: Language }) {
  const t = useTranslations("notifications");
  const app = useMemo(() => appTranslator(language), [language]);
  const dir = language === "AR" ? "rtl" : "ltr";
  const html = template.body?.[language] ?? "";
  const buttonLabel = template.button_label?.[language] ?? "";
  const body = (
    <>
      {html.trim() ? (
        <TemplateHtml html={html} dir={dir} sample />
      ) : (
        <p className="text-start text-sm">
          <Missing>{t("templates.previewNoBody")}</Missing>
        </p>
      )}
      {buttonLabel ? (
        <PreviewButton label={buttonLabel} />
      ) : (
        <p className="mt-4 text-start text-sm">
          <Missing>{t("templates.previewNoButton")}</Missing>
        </p>
      )}
    </>
  );

  if (templateType(template) === "POPUP") {
    return (
      <div className="flex flex-col gap-1.5">
        <PreviewLabel>{t("templates.previewPopup")}</PreviewLabel>
        <div dir={dir} className="rounded-xl border bg-card p-4 shadow-xs">
          {body}
        </div>
      </div>
    );
  }

  const title = template.header_title?.[language] ?? "";
  const subtitle = template.header_subtitle?.[language] ?? "";
  const subject = template.subject?.[language] ?? "";
  const meta = [
    { label: app("previewFrom"), value: template.sender_name ?? "" },
    { label: app("detailSubject"), value: subject },
    { label: app("previewReceived"), value: app("previewNow") },
  ].filter((row) => row.value);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <PreviewLabel>{t("templates.previewBar")}</PreviewLabel>
        <div dir={dir} className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-xs">
          {template.icon ? (
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
              <TemplateIconGlyph icon={template.icon} className="size-5" />
            </span>
          ) : (
            <span
              role="img"
              aria-label={t("templates.previewNoIcon")}
              title={t("templates.previewNoIcon")}
              className="size-9 shrink-0 rounded-full border border-dashed border-muted-foreground/40"
            />
          )}
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm font-semibold">
                {title || <Missing>{t("templates.previewNoTitle")}</Missing>}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">{app("previewNow")}</span>
            </span>
            {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <PreviewLabel>{t("templates.previewDetail")}</PreviewLabel>
        <div dir={dir} className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-xs">
          {meta.length > 0 && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
              {meta.map((row) => (
                <div key={row.label} className="contents">
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="min-w-0 font-medium break-words">{row.value}</dd>
                </div>
              ))}
            </dl>
          )}
          <div>{body}</div>
        </div>
      </div>
    </div>
  );
}
