"use client";

import { useLocale, useTranslations } from "next-intl";
import { fmtList } from "@/lib/format";
import { formatMgrsCode } from "@/lib/mgrs/mgrs";
import { cn } from "@/lib/utils";

export function HoverReadout({
  code,
  inRegion,
  alsoIn,
}: {
  code: string;
  inRegion: boolean;
  alsoIn: string[];
}) {
  const t = useTranslations("locations.editor");
  const locale = useLocale();
  return (
    <div className="pointer-events-none flex max-w-[min(22rem,calc(100vw-2rem))] flex-col gap-0.5 rounded-xl bg-card px-3 py-2 shadow-sm ring-1 ring-foreground/10">
      <div className="flex items-center gap-3">
        <span className="tabular text-sm font-semibold" dir="ltr">
          {formatMgrsCode(code)}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className={cn("size-2 rounded-full", inRegion ? "bg-primary" : "border border-border-strong")}
            aria-hidden
          />
          {inRegion ? t("readoutInRegion") : t("readoutNotPicked")}
        </span>
      </div>
      {alsoIn.length ? (
        <span className="truncate text-xs text-muted-foreground">{t("readoutAlsoIn", { names: fmtList(alsoIn, locale) })}</span>
      ) : null}
    </div>
  );
}
