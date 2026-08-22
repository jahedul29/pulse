import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkline } from "@/components/clients/sparkline";
import { HideButton } from "@/components/common/hide-button";
import { cn } from "@/lib/utils";

const STAT_BRAND = "var(--color-chart-1)";

export function StatCard({
  slug,
  icon: Icon,
  value,
  delta,
  up,
  good,
  label,
  subtitle,
  trend,
  onHide,
  hideLabel,
  className,
}: {
  slug: string;
  icon: LucideIcon;
  value: string;
  delta: string;
  up: boolean;
  good: boolean;
  label: string;
  subtitle?: string;
  trend: { label: string; value: number }[];
  onHide?: () => void;
  hideLabel?: string;
  className?: string;
}) {
  return (
    <Card
      size="sm"
      className={cn(
        "group relative h-full overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 opacity-90 transition-opacity duration-200 group-hover:opacity-100">
        <Sparkline id={slug} data={trend} color={STAT_BRAND} />
      </div>
      <CardContent className="relative flex flex-col gap-2 pb-11">
        <div className="flex items-center justify-between">
          <span
            className="grid size-8 place-items-center rounded-lg"
            style={{
              backgroundColor: `color-mix(in oklab, ${STAT_BRAND}, transparent 88%)`,
              color: STAT_BRAND,
            }}
          >
            <Icon className="size-4" />
          </span>
          {onHide && <HideButton onClick={onHide} label={hideLabel ?? label} />}
        </div>
        <div className="flex items-end gap-2">
          <span className="font-heading text-3xl leading-none font-bold tabular-nums">{value}</span>
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium",
              good ? "bg-success text-success-foreground" : "bg-danger text-danger-foreground",
            )}
          >
            {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {delta}
          </span>
        </div>
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </span>
        {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
      </CardContent>
    </Card>
  );
}
