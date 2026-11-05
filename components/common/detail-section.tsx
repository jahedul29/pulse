import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DetailSection({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-2 border-b pb-2 last:border-b-0 last:pb-0", className)}>
      <div className="flex min-h-7 items-center justify-between gap-2">
        <h3 className="text-xs font-bold tracking-[0.06em] text-muted-foreground uppercase rtl:tracking-normal">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}
