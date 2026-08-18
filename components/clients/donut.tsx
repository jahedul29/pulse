"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { SplitDatum } from "@/lib/types";

function DonutTooltip({ active, payload }: { active?: boolean; payload?: { payload: SplitDatum }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-sm">
      <span className="font-medium">{d.name}</span>
      <span className="ms-2 font-mono text-muted-foreground">{d.value}%</span>
    </div>
  );
}

export function Donut({ data, unit = "%" }: { data: SplitDatum[]; unit?: string }) {
  const top = data.reduce((a, b) => (b.value > a.value ? b : a), data[0]);
  return (
    <div className="flex items-center gap-4">
      <div className="relative size-[132px] shrink-0">
        <div className="pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-center">
          <span className="font-heading text-lg leading-none font-bold tabular-nums">
            {top.value}
            {unit}
          </span>
          <span className="mt-0.5 text-xs tracking-wide text-muted-foreground uppercase">
            {top.name}
          </span>
        </div>
        <ResponsiveContainer width="100%" height="100%" className="relative z-10">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={46}
              outerRadius={66}
              paddingAngle={3}
              cornerRadius={6}
              strokeWidth={0}
              isAnimationActive={false}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.fill} />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltip />} wrapperStyle={{ zIndex: 20, outline: "none" }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex min-w-0 flex-1 flex-col gap-1.5">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-2 text-sm">
            <span className="size-2.5 shrink-0 rounded-sm" style={{ background: d.fill }} />
            <span className="min-w-0 flex-1 truncate text-muted-foreground">{d.name}</span>
            <span className="font-mono text-xs tabular text-foreground">
              {d.value}
              {unit}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
