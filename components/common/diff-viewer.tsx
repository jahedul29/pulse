import type { ReactNode } from "react";
import { isRedacted } from "@/lib/audit/mask";
import { cn } from "@/lib/utils";

export type DiffChange = { column: string; before: string | null; after: string | null };

export type DiffLabels = {
  field: string;
  before: string;
  after: string;
  removed: string;
  added: string;
  empty: string;
};

const EMPTY = "∅";

const VALUE_PILL = "inline-block max-w-full rounded px-1.5 py-px font-mono text-xs leading-5 break-words *:text-xs";
const BEFORE_TONE =
  "bg-danger/10 text-[color-mix(in_oklab,var(--danger)_55%,black)] line-through decoration-danger/50 dark:bg-danger/20 dark:text-[color-mix(in_oklab,var(--danger)_55%,white)]";
const AFTER_TONE =
  "bg-success/20 text-[color-mix(in_oklab,var(--success)_35%,black)] dark:bg-success/20 dark:text-[color-mix(in_oklab,var(--success)_65%,white)]";

function DiffValue({ value, side, render }: { value: string | null; side: "before" | "after"; render: ReactNode }) {
  if (value == null) return <span className="text-[13px] text-muted-foreground">{EMPTY}</span>;
  if (isRedacted(value)) return <>{render}</>;
  return <span className={cn(VALUE_PILL, side === "before" ? BEFORE_TONE : AFTER_TONE)}>{render}</span>;
}

export function DiffViewer({
  changes,
  renderValue,
  labelFor,
  labels,
  className,
}: {
  changes: DiffChange[];
  renderValue?: (value: string, column: string) => ReactNode;
  labelFor?: (column: string) => string;
  labels?: DiffLabels;
  className?: string;
}) {
  const show = (value: string | null, column: string) =>
    value == null ? null : renderValue ? renderValue(value, column) : value;
  const columns = "grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-[9rem_minmax(0,1fr)_minmax(0,1fr)]";
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="overflow-hidden rounded-lg border">
        {labels && (
          <div aria-hidden className={cn(columns, "hidden border-b bg-muted/40 px-3 py-2 text-xs text-muted-foreground sm:grid")}>
            <span>{labels.field}</span>
            <span>{labels.before}</span>
            <span>{labels.after}</span>
          </div>
        )}
        <div className="divide-y">
          {changes.map((change, i) => {
            const label = labelFor?.(change.column);
            return (
              <div key={i} className={cn(columns, "items-start px-3 py-2.5 text-sm")}>
                <div className="col-span-2 flex min-w-0 flex-col sm:col-span-1">
                  {label ? (
                    <>
                      <span className="font-medium break-words">{label}</span>
                      <span className="font-mono text-xs break-all text-muted-foreground">{change.column}</span>
                    </>
                  ) : (
                    <span className="font-mono text-xs break-all text-muted-foreground">{change.column}</span>
                  )}
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  {labels && <span className="text-xs text-muted-foreground sm:sr-only">{labels.before}</span>}
                  <DiffValue value={change.before} side="before" render={show(change.before, change.column)} />
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  {labels && <span className="text-xs text-muted-foreground sm:sr-only">{labels.after}</span>}
                  <DiffValue value={change.after} side="after" render={show(change.after, change.column)} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {labels && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-3 rounded-sm border border-danger/30 bg-danger/10 dark:bg-danger/20" />
            {labels.removed}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-3 rounded-sm border border-success/40 bg-success/20" />
            {labels.added}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden>{EMPTY}</span>
            {labels.empty}
          </span>
        </div>
      )}
    </div>
  );
}
