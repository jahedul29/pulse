"use client";

import { type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const SUPPORT_EMAIL = "it-support@abapro.health";

const TONE = {
  primary: { halo: "bg-primary/25", ring: "bg-primary/10 text-primary ring-primary/15" },
  danger: { halo: "bg-danger/25", ring: "bg-danger-muted text-danger ring-danger/20" },
} as const;

export function StatusNotice({
  icon,
  title,
  body,
  onBack,
  tone = "primary",
  support = false,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  onBack: () => void;
  tone?: "primary" | "danger";
  support?: boolean;
}) {
  const t = useTranslations("auth");
  const tn = TONE[tone];

  return (
    <div
      role="status"
      className="flex flex-col items-center gap-4 py-2 text-center animate-in fade-in-0 zoom-in-95 duration-300"
    >
      <div className="relative grid size-12 place-items-center">
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 rounded-full [animation-duration:2.4s] animate-ping motion-reduce:hidden",
            tn.halo,
          )}
        />
        <span className={cn("relative grid size-12 place-items-center rounded-full ring-1", tn.ring)}>
          {icon}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <h2 className="font-heading text-base font-semibold">{title}</h2>
        <p className="max-w-[30ch] text-sm text-muted-foreground text-pretty">{body}</p>
      </div>

      <div className="mt-1 flex flex-col items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">
          <ArrowLeft className="rtl:-scale-x-100" />
          {t("backToSignIn")}
        </Button>
        {support ? (
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-xs text-muted-foreground underline-offset-4 outline-none transition-colors hover:text-foreground hover:underline focus-visible:text-foreground"
          >
            {t("supportContact")}
          </a>
        ) : null}
      </div>
    </div>
  );
}
