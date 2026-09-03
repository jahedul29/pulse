"use client";

import {
  Bar,
  BarChart as RBarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtNumber } from "@/lib/format";

function BarTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-2.5 py-1.5 text-xs shadow-md ring-1 ring-foreground/5">
      <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</div>
      <span className="font-mono tabular text-sm font-medium">{fmtNumber(payload[0].value)}</span>
    </div>
  );
}

export function BarChart({
  data,
  height = 240,
}: {
  data: { label: string; value: number }[];
  height?: number;
}) {
  const peak = Math.max(...data.map((datum) => datum.value));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RBarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="30%">
        <defs>
          <linearGradient id="bar-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={1} />
            <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0.45} />
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
          width={28}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <Tooltip content={<BarTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.5 }} />
        <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={44} isAnimationActive={false}>
          {data.map((datum) => (
            <Cell key={datum.label} fill={datum.value === peak ? "var(--color-chart-1)" : "url(#bar-fill)"} />
          ))}
        </Bar>
      </RBarChart>
    </ResponsiveContainer>
  );
}
