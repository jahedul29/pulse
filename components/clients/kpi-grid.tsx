"use client";

import { useTranslations } from "next-intl";
import { HidableGrid } from "@/components/common/hidable-grid";
import { KpiCard } from "@/components/clients/kpi-card";
import type { Kpi, Period } from "@/lib/types";

export function KpiGrid({ kpis, period }: { kpis: Kpi[]; period: Period }) {
  const t = useTranslations("common");
  return (
    <HidableGrid
      items={kpis}
      getKey={(kpi) => kpi.key}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      restoreLabel={(count) => `${t("showHidden")} (${count})`}
      allHiddenLabel={t("allHidden")}
      renderItem={(kpi, api) => (
        <KpiCard
          kpi={kpi}
          period={period}
          onHide={api.hide}
          hideLabel={`${t("hide")} ${kpi.label}`}
        />
      )}
    />
  );
}
