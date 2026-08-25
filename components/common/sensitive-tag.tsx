import { cn } from "@/lib/utils";

export type Sensitivity = "financial" | "pii" | "destructive";

const DOT_VAR: Record<Sensitivity, string> = {
  financial: "var(--color-warning)",
  pii: "var(--color-chart-2)",
  destructive: "var(--color-danger)",
};

const DEFAULT_LABEL: Record<Sensitivity, string> = {
  financial: "Financial data",
  pii: "Personal data",
  destructive: "Destructive action",
};

export function SensitivityDot({ kind, label }: { kind: Sensitivity; label?: string }) {
  const text = label ?? DEFAULT_LABEL[kind];
  return (
    <span
      title={text}
      aria-label={text}
      className="inline-block size-2 shrink-0 rounded-full"
      style={{ backgroundColor: DOT_VAR[kind] }}
    />
  );
}

export function SensitiveTag({
  kinds,
  labels,
  showLabel = false,
  className,
}: {
  kinds: Sensitivity[];
  labels?: Partial<Record<Sensitivity, string>>;
  showLabel?: boolean;
  className?: string;
}) {
  if (kinds.length === 0) return null;
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {kinds.map((k) => (
        <span key={k} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <SensitivityDot kind={k} label={labels?.[k]} />
          {showLabel && <span>{labels?.[k] ?? DEFAULT_LABEL[k]}</span>}
        </span>
      ))}
    </span>
  );
}
