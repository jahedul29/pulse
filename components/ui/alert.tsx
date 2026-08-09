import type { ReactNode } from "react";
import { CircleCheck, Info, OctagonX, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "info" | "success" | "warning" | "danger";

const TONE: Record<Tone, { box: string; icon: typeof Info; ic: string }> = {
  info: { box: "border-primary/25 bg-primary/5", icon: Info, ic: "text-primary" },
  success: { box: "border-success/25 bg-success-muted", icon: CircleCheck, ic: "text-success" },
  warning: { box: "border-warning/30 bg-warning-muted", icon: TriangleAlert, ic: "text-warning" },
  danger: { box: "border-danger/25 bg-danger-muted", icon: OctagonX, ic: "text-danger" },
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const t = TONE[tone];
  const Icon = t.icon;
  return (
    <div role="alert" className={cn("flex gap-3 rounded-lg border p-3 text-sm", t.box, className)}>
      <Icon className={cn("mt-0.5 size-4 shrink-0", t.ic)} />
      <div className="flex min-w-0 flex-col gap-0.5">
        {title && <div className="font-medium text-foreground">{title}</div>}
        {children && <div className="text-muted-foreground">{children}</div>}
      </div>
    </div>
  );
}
