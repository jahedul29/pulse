import { Package, PauseCircle, Trash2, UserCheck, UserPlus, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { StatCard } from "@/components/common/stat-card";
import { fmtCompact, fmtDelta } from "@/lib/format";
import type { Kpi, Period } from "@/lib/types";

const INVERSE = new Set(["suspended", "deleted"]);

const KPI_ICON: Record<string, LucideIcon> = {
  new: UserPlus,
  total: Users,
  profile: UserCheck,
  activePkg: Package,
  suspended: PauseCircle,
  deleted: Trash2,
};

export function KpiCard({
  kpi,
  period,
  onHide,
  hideLabel,
}: {
  kpi: Kpi;
  period: Period;
  onHide?: () => void;
  hideLabel?: string;
}) {
  const delta = kpi.deltas[period];
  const good = INVERSE.has(kpi.key) ? delta <= 0 : delta >= 0;

  return (
    <StatCard
      slug={kpi.key}
      icon={KPI_ICON[kpi.key] ?? Users}
      value={fmtCompact(kpi.values[period])}
      delta={fmtDelta(delta)}
      up={delta >= 0}
      good={good}
      label={kpi.label}
      subtitle={kpi.hint}
      trend={kpi.trends[period]}
      onHide={onHide}
      hideLabel={hideLabel}
    />
  );
}
