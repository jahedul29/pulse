import type { ReactNode } from "react";

import { ProfileCell } from "@/components/common/profile-cell";
import { RecordLink } from "@/components/common/record-link";
import { recipientName, type NotificationDeliveryDto } from "@/lib/notifications/dto";
import { recordHref } from "@/lib/record-links";

type Translate = (key: string, values?: Record<string, string>) => string;
type DetailItem = { label: string; value: ReactNode };

export function recipientItem(record: NotificationDeliveryDto, t: Translate): DetailItem {
  const name = recipientName(record);
  const account = record.admin_account;
  const cell = (
    <ProfileCell
      name={name}
      subtitle={[account?.username, account?.email].filter(Boolean).join(" · ") || undefined}
    />
  );
  return {
    label: t("log.colRecipient"),
    value: record.admin_account_id ? (
      <RecordLink href={recordHref("adminAccount", record.admin_account_id)} label={t("log.openRecipient", { name })}>
        {cell}
      </RecordLink>
    ) : (
      cell
    ),
  };
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
