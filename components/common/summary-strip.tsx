import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SummaryItem = { label: string; value: ReactNode };

export function SummaryStrip({ items, className }: { items: SummaryItem[]; className?: string }) {
  return (
    <dl
      className={cn("grid divide-x rounded-lg border", className)}
      style={{ gridTemplateColumns: `minmax(0, 1.4fr) repeat(${Math.max(items.length - 1, 0)}, minmax(0, 1fr))` }}
    >
      {items.map((item, index) => (
        <div key={index} className="flex min-w-0 flex-col gap-1 px-3 py-2">
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd className="flex min-h-6 min-w-0 flex-wrap items-center gap-x-1 text-sm font-medium">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
