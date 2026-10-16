"use client";

import { memo, type ReactNode } from "react";
import { Crosshair, LocateFixed, MapPin, TriangleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { fmtCoordinate } from "@/lib/format";
import type { LngLat } from "@/lib/mgrs/grid";
import type { CentreSource } from "@/lib/region-builder/selection";

export function formatCentre(centre: LngLat, locale: string): string {
  return `${fmtCoordinate(centre[1], locale)}, ${fmtCoordinate(centre[0], locale)}`;
}

function CentreAction({
  label,
  icon,
  lockReason,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  lockReason: string | null;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            onClick={onClick}
            focusableWhenDisabled
            disabled={lockReason !== null}
            className="justify-start data-[disabled]:hover:bg-transparent"
          />
        }
      >
        {icon}
        {label}
      </TooltipTrigger>
      <TooltipContent>{lockReason ?? label}</TooltipContent>
    </Tooltip>
  );
}

export const CentreOptions = memo(function CentreOptions({
  centre,
  source,
  inside,
  lockReason,
  onShow,
  onMiddle,
  onMapCentre,
}: {
  centre: LngLat | null;
  source: CentreSource;
  inside: boolean;
  lockReason: string | null;
  onShow: () => void;
  onMiddle: () => void;
  onMapCentre: () => void;
}) {
  const t = useTranslations("locations.editor");
  const locale = useLocale();
  return (
    <>
      {centre ? (
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="tabular text-sm font-medium" dir="ltr">
            {formatCentre(centre, locale)}
          </span>
          <span className="text-xs text-muted-foreground">{t(`centreSource_${source}`)}</span>
        </div>
      ) : (
        <p className="text-xs text-pretty text-muted-foreground">{t("centreNone")}</p>
      )}
      {centre && !inside ? (
        <p className="flex items-start gap-1.5 text-xs text-pretty text-foreground">
          <TriangleAlert className="mt-px size-3.5 shrink-0 text-warning" aria-hidden />
          {t("centreOutside")}
        </p>
      ) : null}
      <TooltipProvider>
        <div className="flex flex-col gap-1">
          <Button variant="ghost" size="sm" onClick={onShow} disabled={!centre} className="justify-start">
            <MapPin aria-hidden />
            {t("centreShow")}
          </Button>
          <CentreAction label={t("centreMiddle")} icon={<LocateFixed aria-hidden />} lockReason={lockReason} onClick={onMiddle} />
          <CentreAction label={t("centreMapCentre")} icon={<Crosshair aria-hidden />} lockReason={lockReason} onClick={onMapCentre} />
        </div>
      </TooltipProvider>
    </>
  );
});
