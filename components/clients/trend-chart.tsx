"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslations } from "next-intl";
import { fmtNumber } from "@/lib/format";

function TrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  const t = useTranslations("clients");
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-2.5 py-1.5 text-xs shadow-md ring-1 ring-foreground/5">
      <div className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">{label}</div>
      <span className="font-mono tabular text-sm font-medium">{fmtNumber(payload[0].value)}</span>
      <span className="ms-1 text-muted-foreground">{t("newClientsUnit")}</span>
    </div>
  );
}

export function TrendChart({ data }: { data: { label: string; value: number }[] }) {
  const last = data.length - 1;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.32} />
            <stop offset="55%" stopColor="var(--color-chart-1)" stopOpacity={0.08} />
            <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.6} strokeDasharray="4 4" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickMargin={8}
        />
        <YAxis
          width={36}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <Tooltip content={<TrendTooltip />} cursor={{ stroke: "var(--color-chart-1)", strokeOpacity: 0.4, strokeDasharray: "4 4" }} />
        <Area
          type="monotone"
          dataKey="value"
          stroke="var(--color-chart-1)"
          strokeWidth={2.5}
          fill="url(#trend-fill)"
          isAnimationActive={false}
          dot={(props: { cx?: number; cy?: number; index?: number }) =>
            props.index === last ? (
              <circle
                key="trend-last-dot"
                cx={props.cx}
                cy={props.cy}
                r={4}
                fill="var(--color-chart-1)"
                stroke="var(--card)"
                strokeWidth={2}
              />
            ) : (
              <g key={props.index} />
            )
          }
          activeDot={{ r: 5, fill: "var(--color-chart-1)", stroke: "var(--card)", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
