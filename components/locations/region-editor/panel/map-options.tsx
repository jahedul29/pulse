"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import { Switch } from "@/components/common/toggle-switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MAP_BACKGROUNDS, type MapBackground } from "@/lib/region-builder/backgrounds";
import { cn } from "@/lib/utils";

const REGION_SWATCH: Record<MapBackground, string> = {
  grey: "border-(--map-picked) bg-(--map-picked)/45",
  streets: "border-(--map-picked) bg-(--map-picked)/45",
  dark: "border-(--map-picked-on-dark) bg-(--map-picked-on-dark)/45",
  none: "border-(--map-picked) bg-(--map-picked)/45 dark:border-(--map-picked-on-dark) dark:bg-(--map-picked-on-dark)/45",
};

export const MapOptions = memo(function MapOptions({
  background,
  onBackgroundChange,
  showGrid,
  onShowGridChange,
  showOthers,
  onShowOthersChange,
}: {
  background: MapBackground;
  onBackgroundChange: (background: MapBackground) => void;
  showGrid: boolean;
  onShowGridChange: (show: boolean) => void;
  showOthers: boolean;
  onShowOthersChange: (show: boolean) => void;
}) {
  const t = useTranslations("locations.editor");
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="region-editor-background" className="text-sm font-medium">
          {t("background")}
        </label>
        <Select
          value={background}
          onValueChange={(value) => {
            if (value) onBackgroundChange(value as MapBackground);
          }}
        >
          <SelectTrigger id="region-editor-background" size="sm" className="w-32">
            <SelectValue>{(value) => (value ? t(`background_${value}`) : "")}</SelectValue>
          </SelectTrigger>
          <SelectContent align="end">
            {MAP_BACKGROUNDS.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`background_${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <label className="flex cursor-pointer items-center justify-between gap-3">
        <span className="text-sm font-medium">{t("showGrid")}</span>
        <Switch checked={showGrid} onCheckedChange={onShowGridChange} aria-label={t("showGrid")} />
      </label>
      <label className="flex cursor-pointer items-center justify-between gap-3">
        <span className="text-sm font-medium">{t("showOtherRegions")}</span>
        <Switch checked={showOthers} onCheckedChange={onShowOthersChange} aria-label={t("showOtherRegions")} />
      </label>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <span className={cn("size-3 rounded-sm border", REGION_SWATCH[background])} aria-hidden />
          {t("legendRegion")}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm border border-(--map-other)/60 bg-(--map-other)/25" aria-hidden />
          {t("legendOthers")}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm border border-dashed border-(--map-remove)" aria-hidden />
          {t("legendRemoving")}
        </li>
      </ul>
    </>
  );
});
