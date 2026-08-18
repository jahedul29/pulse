"use client";

import { useTranslations } from "next-intl";
import { Progress } from "@/components/ui/progress";
import type { ServiceBalance } from "@/lib/types";

export function ServiceBalanceCard({ balance }: { balance: ServiceBalance }) {
  const t = useTranslations("clients.profile");
  const usedPct = balance.paid > 0 ? Math.round((balance.used / balance.paid) * 100) : 0;
  return (
    <div className="rounded-lg border p-3.5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium">{balance.label}</span>
        <span className="font-mono text-xs text-muted-foreground">{balance.unit}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-heading text-2xl font-semibold tabular">{balance.available}</span>
        <span className="text-xs text-muted-foreground">{t("ofAvailable", { paid: balance.paid })}</span>
      </div>
      <Progress value={usedPct} className="mt-2.5 h-1.5" />
      <div className="mt-2 flex justify-between font-mono text-xs text-muted-foreground tabular">
        <span>{t("used", { count: balance.used })}</span>
        <span>{t("canceled", { count: balance.canceled })}</span>
      </div>
    </div>
  );
}
