"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function StageState({
  message,
  loading,
  onRetry,
  action,
  hidden = false,
}: {
  message: string;
  loading?: boolean;
  onRetry?: () => void;
  action?: ReactNode;
  hidden?: boolean;
}) {
  const tc = useTranslations("common");
  return (
    <div
      aria-hidden={hidden || undefined}
      inert={hidden || undefined}
      className={cn(
        "absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-muted/80 p-6 text-center transition-opacity duration-200 ease-out animate-in fade-in-0 motion-reduce:animate-none motion-reduce:transition-none",
        hidden && "pointer-events-none opacity-0",
      )}
    >
      {loading ? <Loader2 className="size-5 animate-spin text-primary" aria-hidden /> : null}
      <p className="max-w-sm text-sm text-pretty text-muted-foreground">{message}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {tc("retry")}
        </Button>
      ) : null}
      {action}
    </div>
  );
}
