"use client";

import { useTranslations } from "next-intl";
import { Clock, Hourglass, KeyRound, ServerCrash, TriangleAlert, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ServerErrorInfo, ServerErrorKind } from "@/lib/auth/server-error";

const ICON: Record<ServerErrorKind, typeof WifiOff> = {
  credentials: KeyRound,
  network: WifiOff,
  timeout: Clock,
  unavailable: ServerCrash,
  server: ServerCrash,
  rate_limited: Hourglass,
  unknown: TriangleAlert,
};

export function LoginErrorBanner({ error, onRetry }: { error: ServerErrorInfo; onRetry: () => void }) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const Icon = ICON[error.kind];
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-lg border border-danger/20 border-s-[3px] border-s-danger bg-danger-muted/40 px-3.5 py-3"
    >
      <Icon className="mt-px size-4.5 shrink-0 text-danger" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-sm leading-5 font-semibold text-foreground">{t(`serverErrorTitle_${error.kind}`)}</p>
        <p className="text-sm leading-5 text-foreground/75 text-pretty [overflow-wrap:anywhere]">
          {error.message ?? t(`serverErrorBody_${error.kind}`)}
        </p>
        {error.kind !== "credentials" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-1.5 self-start bg-background"
          >
            {tc("retry")}
          </Button>
        )}
      </div>
    </div>
  );
}
