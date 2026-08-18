import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "danger" | "neutral";

const TONE: Record<Tone, string> = {
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
  danger: "bg-danger text-danger-foreground",
  neutral: "bg-muted text-muted-foreground",
};

export function StatusDot({ tone }: { tone: Tone }) {
  const color: Record<Tone, string> = {
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
    neutral: "bg-muted-foreground",
  };
  return <span className={cn("size-1.5 rounded-full", color[tone])} />;
}

export function StatusBadge({
  tone,
  children,
  className,
  equalWidth = true,
}: {
  tone: Tone;
  children: React.ReactNode;
  className?: string;
  equalWidth?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        equalWidth && "min-w-[var(--badge-w)]",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function accountTone(status: string): Tone {
  if (status === "active") return "success";
  if (status === "suspended") return "warning";
  return "danger";
}

export const ACCOUNT_STATUS_LABEL: Record<string, string> = {
  active: "Active",
  suspended: "Suspended",
  deleted: "Deleted",
};
