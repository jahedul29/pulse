"use client";

import { useLocale, useTranslations } from "next-intl";

import { DateTimeValue } from "@/components/common/date-time-value";
import { DetailList } from "@/components/common/detail-list";
import { DetailSection } from "@/components/common/detail-section";
import { LoadError } from "@/components/common/load-error";
import { InlineRecordLink, RecordLink } from "@/components/common/record-link";
import { Skeleton } from "@/components/ui/skeleton";
import { useTargetHistory } from "@/lib/admin-actions/queries";
import { ADMIN_ACTION_LOGS_PATH } from "@/lib/api/audit-paths";
import { useProbeAllowed } from "@/lib/auth/access-probes";
import { recordHref } from "@/lib/record-links";

export function TargetHistory({ targetId }: { targetId: string }) {
  const t = useTranslations("auditLog");
  const locale = useLocale();
  const allowed = useProbeAllowed(ADMIN_ACTION_LOGS_PATH);
  const historyQuery = useTargetHistory(allowed ? targetId : null);
  if (!allowed) return null;
  return (
    <DetailSection title={t("history")}>
      {historyQuery.isError ? (
        <LoadError error={historyQuery.error} message={t("historyLoadError")} onRetry={() => historyQuery.refetch()} className="py-6" />
      ) : historyQuery.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : (historyQuery.data?.entries ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("historyEmpty")}</p>
      ) : (
        <>
        <DetailList
          divided
          items={(historyQuery.data?.entries ?? []).map((action) => ({
            label: <DateTimeValue epoch={action.createdAt} locale={locale} />,
            value: (
              <span className="flex min-w-0 flex-col items-start">
                <RecordLink href={recordHref("auditLog", action.id)}>{action.actionName}</RecordLink>
                <span className="text-xs font-normal text-muted-foreground">
                  {t.rich("historyBy", {
                    name: action.actorName,
                    link: (chunks) =>
                      action.actorId ? (
                        <InlineRecordLink href={recordHref("adminAccount", action.actorId)}>{chunks}</InlineRecordLink>
                      ) : (
                        chunks
                      ),
                  })}
                </span>
              </span>
            ),
          }))}
        />
        {(historyQuery.data?.total ?? 0) > (historyQuery.data?.entries.length ?? 0) && (
          <p className="text-xs text-muted-foreground">
            {t("historyTruncated", {
              shown: historyQuery.data?.entries.length ?? 0,
              total: historyQuery.data?.total ?? 0,
            })}
          </p>
        )}
        </>
      )}
    </DetailSection>
  );
}
