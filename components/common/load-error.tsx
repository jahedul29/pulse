"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { NoAccess } from "@/components/common/no-access";
import { isForbidden } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

export function firstError(...errors: unknown[]): unknown {
  return errors.find(isForbidden) ?? errors.find((error) => error != null) ?? null;
}

export function LoadError({
  error,
  message,
  onRetry,
  action,
  className,
}: {
  error: unknown;
  message: string;
  onRetry?: () => void;
  action?: ReactNode;
  className?: string;
}) {
  const tc = useTranslations("common");
  if (isForbidden(error)) return <NoAccess className={className} action={action} />;
  return (
    <div className={cn("flex flex-col items-center gap-3 py-16 text-center", className)}>
      <p className="text-sm text-muted-foreground">{message}</p>
      {onRetry || action ? (
        <div className="flex flex-wrap justify-center gap-2">
          {onRetry ? (
            <Button variant="outline" size="sm" onClick={onRetry}>
              {tc("retry")}
            </Button>
          ) : null}
          {action}
        </div>
      ) : null}
    </div>
  );
}
