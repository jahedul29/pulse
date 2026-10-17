"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ShieldX } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { firstAccessiblePath } from "@/lib/auth/access";
import { useAccessSnapshot } from "@/lib/auth/access-probes";
import { cn } from "@/lib/utils";

function AccessDeniedPage({ className, action }: { className?: string; action?: ReactNode }) {
  const t = useTranslations("access");
  const { session, probes } = useAccessSnapshot();
  const startPage = firstAccessiblePath(session, probes);
  return (
    <div className={cn("mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center", className)}>
      <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <ShieldX className="size-6" aria-hidden />
      </span>
      <div className="flex flex-col gap-1.5">
        <h1 className="font-heading text-lg font-semibold">{startPage ? t("pageTitle") : t("noAccessTitle")}</h1>
        <p className="text-sm text-pretty text-muted-foreground">{startPage ? t("pageBody") : t("noAccessBody")}</p>
      </div>
      {action ??
        (startPage ? (
          <Link href={startPage} className={buttonVariants({ variant: "outline", size: "lg" })}>
            {t("goToStart")}
          </Link>
        ) : null)}
    </div>
  );
}

export function NoAccess({
  variant = "section",
  className,
  action,
}: {
  variant?: "page" | "section";
  className?: string;
  action?: ReactNode;
}) {
  const t = useTranslations("access");
  if (variant === "page") return <AccessDeniedPage className={className} action={action} />;
  return (
    <div role="status" className={cn("flex flex-col items-center gap-3 py-16 text-center", className)}>
      <ShieldX className="size-6 text-muted-foreground" aria-hidden />
      <p className="max-w-sm text-sm text-pretty text-muted-foreground">{t("contentDenied")}</p>
      {action}
    </div>
  );
}
