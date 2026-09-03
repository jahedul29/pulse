import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type DiffChange = { column: string; before: string | null; after: string | null };

const EMPTY = "∅";

export function DiffViewer({
  changes,
  className,
}: {
  changes: DiffChange[];
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {changes.map((change, i) => (
        <div key={i} className="rounded-lg border p-3">
          <div className="mb-1.5 font-mono text-xs text-muted-foreground">{change.column}</div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span
              className={cn(
                "rounded px-1.5 py-0.5",
                change.before == null
                  ? "text-muted-foreground"
                  : "bg-danger/10 text-danger line-through decoration-danger/40",
              )}
            >
              {change.before ?? EMPTY}
            </span>
            <ArrowRight className="size-3 shrink-0 text-muted-foreground rtl:-scale-x-100" />
            <span
              className={cn(
                "rounded px-1.5 py-0.5",
                change.after == null ? "text-muted-foreground" : "bg-success/10 text-success",
              )}
            >
              {change.after ?? EMPTY}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
