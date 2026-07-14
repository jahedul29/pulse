import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Sparkline } from "@/components/clients/sparkline";
import { fmtCompact, fmtDelta } from "@/lib/format";
import type { Kpi, Period } from "@/lib/types";
import { cn } from "@/lib/utils";

const INVERSE = new Set(["suspended", "deleted"]);

export function KpiCard({ kpi, period }: { kpi: Kpi; period: Period }) {
  const value = kpi.values[period];
  const delta = kpi.deltas[period];
  const trend = kpi.trends[period];
  const good = INVERSE.has(kpi.key) ? delta <= 0 : delta >= 0;
  const Icon = delta >= 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <Card className="gap-0 p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {kpi.label}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-mono text-xs font-medium",
            good ? "bg-success-muted text-success" : "bg-danger-muted text-danger",
          )}
        >
          <Icon className="size-3" />
          {fmtDelta(delta)}
        </span>
      </div>
      <div className="mt-2 font-heading text-3xl font-semibold tabular tracking-tight">
        {fmtCompact(value)}
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">{kpi.hint}</div>
      <div className="mt-3">
        <Sparkline data={trend} id={kpi.key} />
      </div>
    </Card>
  );
}
