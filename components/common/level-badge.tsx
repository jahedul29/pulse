import type { ReactNode } from "react";
import { StatusDot, type Tone } from "@/components/common/status-badge";
import { cn } from "@/lib/utils";

const LEVEL: Record<Tone, string> = {
  neutral: "border-border bg-muted text-foreground",
  warning:
    "border-warning/45 bg-warning/15 text-[color-mix(in_oklab,var(--warning)_45%,black)] dark:text-[color-mix(in_oklab,var(--warning)_70%,white)]",
  danger:
    "border-danger/30 bg-danger/10 text-[color-mix(in_oklab,var(--danger)_60%,black)] dark:bg-danger/20 dark:text-[color-mix(in_oklab,var(--danger)_60%,white)]",
  success:
    "border-success/40 bg-success/15 text-[color-mix(in_oklab,var(--success)_35%,black)] dark:text-[color-mix(in_oklab,var(--success)_65%,white)]",
};

export function LevelBadge({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center justify-center gap-1.5 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap",
        LEVEL[tone],
        className,
      )}
    >
      <StatusDot tone={tone} />
      {children}
    </span>
  );
}
