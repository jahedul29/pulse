"use client";

import { Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { IDLE_TIMEOUT_MINUTES } from "@/lib/auth/idle";

export function IdleSignOutNotice() {
  const t = useTranslations("auth");
  return (
    <div
      role="status"
      className="flex items-start gap-2.5 rounded-lg border border-primary/20 border-s-[3px] border-s-primary bg-accent/40 px-3.5 py-3"
    >
      <Clock className="mt-px size-4.5 shrink-0 text-primary" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-sm leading-5 font-semibold text-foreground">{t("idleSignedOutTitle")}</p>
        <p className="text-sm leading-5 text-pretty text-foreground/75">
          {t("idleSignedOutBody", { minutes: IDLE_TIMEOUT_MINUTES })}
        </p>
      </div>
    </div>
  );
}
