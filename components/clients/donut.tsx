"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { SplitDatum } from "@/lib/types";

function DonutTooltip({ active, payload }: { active?: boolean; payload?: { payload: SplitDatum }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-sm">
      <span className="font-medium">{d.name}</span>
      <span className="ml-2 font-mono text-muted-foreground">{d.value}%</span>
    </div>
  );
}

export function Donut({ data, unit = "%" }: { data: SplitDatum[]; unit?: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="relative size-[132px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={42}
              outerRadius={64}
              paddingAngle={2}
              strokeWidth={0}
              isAnimationActive={false}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.fill} />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltip />} />
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
