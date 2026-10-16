import { Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function MapNotice({
  children,
  tone = "info",
  action,
}: {
  children: ReactNode;
  tone?: "info" | "warning";
  action?: ReactNode;
}) {
  const Icon = tone === "warning" ? TriangleAlert : Info;
  return (
    <div
      className={cn(
        "flex max-w-full items-center gap-2 rounded-full bg-card px-3 py-1.5 text-xs font-medium shadow-sm ring-1 ring-foreground/10",
        action && "pointer-events-auto rounded-2xl py-1 pe-1",
      )}
    >
      <Icon className={cn("size-3.5 shrink-0", tone === "warning" ? "text-warning" : "text-muted-foreground")} aria-hidden />
      <span className="text-pretty">{children}</span>
      {action}
    </div>
  );
}
