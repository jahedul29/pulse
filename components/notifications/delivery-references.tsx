"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlertCircle } from "lucide-react";

import { DateTimeValue } from "@/components/common/date-time-value";
import { DetailList } from "@/components/common/detail-list";
import { DetailSection } from "@/components/common/detail-section";
import { LoadError } from "@/components/common/load-error";
import { RecordDrawerHeader } from "@/components/common/record-drawer-header";
import { RecordLink } from "@/components/common/record-link";
import { StatusBadge } from "@/components/common/status-badge";
import { SheetBody, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  deliveryStatusTone,
  recipientName,
  severityTone,
  type NotificationDeliveryDto,
} from "@/lib/notifications/dto";
import { recordHref } from "@/lib/record-links";
import type { RecordPager } from "@/lib/use-record-pager";
import { AdminProfileLink } from "@/components/common/admin-profile-link";

type Translate = (key: string, values?: Record<string, string>) => string;
type DetailItem = { label: string; value: ReactNode };

export function recipientCell(record: NotificationDeliveryDto, t: Translate): ReactNode {
  const name = recipientName(record);
  const account = record.admin_account;
  return (
    <AdminProfileLink
      id={record.admin_account_id}
      name={name}
      subtitle={[account?.username, account?.email].filter(Boolean).join(" · ")}
      label={t("log.openRecipient", { name })}
    />
  );
}

export function channelItem(record: NotificationDeliveryDto, t: Translate): DetailItem {
  return { label: t("log.colChannel"), value: record.channel?.name || record.channel?.code || "-" };
}

export function templateItem(record: NotificationDeliveryDto, t: Translate): DetailItem {
  const name = record.template?.name || record.template?.code || t("log.colTemplate");
  return {
    label: t("log.colTemplate"),
    value: record.template_id ? (
      <RecordLink href={recordHref("template", record.template_id)} label={t("log.openTemplate", { name })}>
        {name}
      </RecordLink>
    ) : (
      "-"
    ),
  };
}

export function alertRouteItems(record: NotificationDeliveryDto, t: Translate): DetailItem[] {
  if (!record.alert_route_id) return [];
  const name = record.alert_route?.name || record.alert_route?.code || t("log.colAlertRoute");
  return [
    {
      label: t("log.colAlertRoute"),
      value: (
        <RecordLink href={recordHref("alertRoute", record.alert_route_id)} label={t("log.openAlertRoute", { name })}>
          {name}
        </RecordLink>
      ),
    },
  ];
}

export function campaignItem(record: NotificationDeliveryDto, t: Translate): DetailItem {
  return { label: t("log.colCampaign"), value: record.campaign?.name || "-" };
}

function stampOf(record: NotificationDeliveryDto): number | null {
  const stamp = record.sent_at ?? record.created_at;
  return stamp ? Date.parse(stamp) : null;
}

export function DeliveryDrawerContent({
  record,
  link,
  pager,
  loading,
  error,
  loadErrorLabel,
  onRetry,
}: {
  record: NotificationDeliveryDto;
  link: string;
  pager: RecordPager;
  loading: boolean;
  error: unknown;
  loadErrorLabel: string;
  onRetry: () => void;
}) {
  const t = useTranslations("notifications");
  const locale = useLocale();
  const sentAt = stampOf(record);
  const title = record.title || t("log.untitledDelivery");
  return (
    <SheetContent onSwipeNext={() => pager.step(1)} onSwipePrev={() => pager.step(-1)}>
      <RecordDrawerHeader
        pager={pager}
        link={link}
        title={title}
        summary={[
          { label: t("log.colTimestamp"), value: sentAt == null ? "-" : <DateTimeValue epoch={sentAt} locale={locale} /> },
          {
            label: t("log.colSeverity"),
            value: record.severity ? (
              <StatusBadge tone={severityTone(record.severity)} equalWidth={false}>
                {t(`deliverySeverity.${record.severity}`)}
              </StatusBadge>
            ) : (
              "-"
            ),
          },
          {
            label: t("log.colStatus"),
            value: (
              <StatusBadge tone={deliveryStatusTone(record.status)} equalWidth={false}>
                {t(`deliveryStatus.${record.status}`)}
              </StatusBadge>
            ),
          },
        ]}
      />
      <SheetBody className="flex flex-col gap-6">
        {error ? (
          <LoadError error={error} message={loadErrorLabel} onRetry={onRetry} className="py-10" />
        ) : loading ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            <DetailSection title={t("log.colRecipient")}>{recipientCell(record, t)}</DetailSection>
            <DetailSection title={t("log.sectionDelivery")}>
              <DetailList
                divided
                items={[
                  channelItem(record, t),
                  templateItem(record, t),
                  campaignItem(record, t),
                  ...alertRouteItems(record, t),
                  {
                    label: t("log.colCreated"),
                    value: record.created_at ? <DateTimeValue epoch={Date.parse(record.created_at)} locale={locale} /> : "-",
                  },
                  ...(record.error_message
                    ? [
                        {
                          label: t("log.colError"),
                          value: (
                            <span className="flex items-start gap-1.5">
                              <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-danger" />
                              <span>{record.error_message}</span>
                            </span>
                          ),
                        },
                      ]
                    : []),
                ]}
              />
            </DetailSection>
            {record.body && (
              <DetailSection title={t("log.messageBody")}>
                <p className="rounded-lg border bg-muted/30 p-3 text-sm whitespace-pre-line">{record.body}</p>
              </DetailSection>
            )}
          </>
        )}
      </SheetBody>
    </SheetContent>
  );
}
