import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PanelSection({
  title,
  children,
  className,
  titleId,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  titleId?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-3 border-b px-4 py-4 last:border-b-0", className)} aria-labelledby={titleId}>
      {title ? (
        <h2 id={titleId} className="text-sm font-semibold">
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}
