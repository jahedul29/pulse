import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DetailList({
  items,
  className,
}: {
  items: { label: string; value: ReactNode }[];
  className?: string;
}) {
  return (
    <dl className={cn("flex flex-col gap-2 text-sm", className)}>
      {items.map((it, i) => (
        <div key={i} className="flex gap-4">
          <dt className="w-28 shrink-0 text-muted-foreground">{it.label}</dt>
          <dd className="min-w-0 flex-1 font-medium break-words">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}
