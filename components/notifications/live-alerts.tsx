"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, StatusDot } from "@/components/common/status-badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { fmtRelative, fmtDateTime } from "@/lib/format";
import { useIsClient } from "@/lib/use-is-client";
import { fetchLiveAlerts } from "@/lib/notifications/api";
import { urgencyTone } from "@/lib/notifications/tones";
import type { LiveAlert, Urgency } from "@/lib/notifications/types";

const SEVERITY_ORDER: Urgency[] = ["high", "medium", "low"];

export function LiveAlerts() {
  const t = useTranslations("notifications");
  const locale = useLocale();
  const isClient = useIsClient();

  const [alerts, setAlerts] = useState<LiveAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    fetchLiveAlerts()
      .then((r) => {
        setAlerts(r);
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const onFocus = () => load();
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  return (
    <div className="mx-auto max-w-5xl">
      <Card>
        <CardHeader>
          <CardTitle>{t("alerts.title")}</CardTitle>
          <CardDescription>{t("alerts.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="py-16 text-center text-sm text-muted-foreground">{t("alerts.loadError")}</p>
          ) : loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-success/15 text-success">
                <ShieldCheck className="size-6" />
              </span>
              <p className="text-sm font-medium">{t("alerts.emptyTitle")}</p>
              <p className="text-sm text-muted-foreground">{t("alerts.empty")}</p>
            </div>
          ) : (
            <TooltipProvider>
              <div className="flex flex-col gap-6">
                {SEVERITY_ORDER.map((severity) => {
                  const group = alerts.filter((a) => a.severity === severity);
                  if (group.length === 0) return null;
                  return (
                    <section key={severity} className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <StatusDot tone={urgencyTone(severity)} />
                        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                          {t(`urgency.${severity}`)}
                        </h3>
                        <span className="text-xs text-muted-foreground tabular">({group.length})</span>
                      </div>
                      <ul className="flex flex-col gap-2">
                        {group.map((alert) => (
                          <li
                            key={alert.id}
                            className="flex items-start gap-3 rounded-lg border p-3"
                          >
                            <div className="flex min-w-0 flex-1 flex-col gap-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium">{alert.eventName}</span>
                                <StatusBadge tone={urgencyTone(alert.severity)}>
                                  {t(`urgency.${alert.severity}`)}
                                </StatusBadge>
                              </div>
                              <p className="text-sm text-muted-foreground">{alert.summary}</p>
                            </div>
                            {isClient && (
                              <Tooltip>
                                <TooltipTrigger render={<span className="shrink-0 text-xs text-muted-foreground tabular" />}>
                                  {fmtRelative(alert.firedAt, locale)}
                                </TooltipTrigger>
                                <TooltipContent>{fmtDateTime(alert.firedAt, locale)}</TooltipContent>
                              </Tooltip>
                            )}
                          </li>
                        ))}
                      </ul>
                    </section>
                  );
                })}
              </div>
            </TooltipProvider>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
