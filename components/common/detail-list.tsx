import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DetailList({
  items,
  divided = false,
  className,
}: {
  items: { label: ReactNode; value: ReactNode }[];
  divided?: boolean;
  className?: string;
}) {
  if (divided) {
    return (
      <dl className={cn("flex flex-col divide-y text-sm", className)}>
        {items.map((item, index) => (
          <div key={index} className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-start gap-3 py-1 first:pt-0 last:pb-0 sm:grid-cols-[8.5rem_minmax(0,1fr)]">
            <dt className="flex min-h-7 items-center text-[13px] text-muted-foreground">{item.label}</dt>
            <dd className="flex min-h-7 min-w-0 flex-col justify-center font-medium break-words">{item.value}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return (
    <dl className={cn("flex flex-col gap-2 text-sm", className)}>
      {items.map((item, index) => (
        <div key={index} className="flex gap-4">
          <dt className="w-28 shrink-0 text-muted-foreground">{item.label}</dt>
          <dd className="min-w-0 flex-1 font-medium break-words">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
