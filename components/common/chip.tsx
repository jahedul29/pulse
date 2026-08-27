import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ChipVariant = "outline" | "soft";

const VARIANT: Record<ChipVariant, string> = {
  outline: "border border-border-strong/60 bg-muted text-foreground",
  soft: "bg-border-strong/50 text-foreground",
};

export function Chip({
  variant = "outline",
  className,
  children,
}: {
  variant?: ChipVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium leading-none whitespace-nowrap transition-colors",
        VARIANT[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
