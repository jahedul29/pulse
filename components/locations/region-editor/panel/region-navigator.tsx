"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { IconInput } from "@/components/ui/icon-input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { fmtCount } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface NavigatorRegion {
  id: number;
  label: string;
  code: string | null;
  mapped: boolean;
  active: boolean;
}

const SEARCH_THRESHOLD = 5;

function matches(region: NavigatorRegion, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return true;
  return region.label.toLocaleLowerCase().includes(needle) || (region.code ?? "").toLocaleLowerCase().includes(needle);
}

export function RegionNavigator({
  countryLabel,
  regions,
  currentRegionId,
  onSelectRegion,
  onCreateRegion,
  canEdit,
  noPermissionLabel,
}: {
  countryLabel: string;
  regions: NavigatorRegion[];
  currentRegionId: number;
  onSelectRegion: (id: number) => void;
  onCreateRegion: () => void;
  canEdit: boolean;
  noPermissionLabel: string;
}) {
  const t = useTranslations("locations.editor");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const visible = useMemo(() => regions.filter((region) => matches(region, query)), [query, regions]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 id="region-editor-regions" className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <span className="truncate">{t("regionsIn", { country: countryLabel })}</span>
          <span className="tabular shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {fmtCount(regions.length, locale)}
          </span>
        </h2>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={t("newRegion")}
                  focusableWhenDisabled
                  disabled={!canEdit}
                  onClick={onCreateRegion}
                  className="data-[disabled]:hover:bg-background"
                />
              }
            >
              <Plus aria-hidden />
              {t("newRegionShort")}
            </TooltipTrigger>
            <TooltipContent>{canEdit ? t("newRegion") : noPermissionLabel}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {regions.length > SEARCH_THRESHOLD ? (
        <IconInput
          size="sm"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("searchRegions")}
          aria-label={t("searchRegions")}
          leading={<Search className="size-3.5" aria-hidden />}
        />
      ) : null}

      {regions.length === 0 ? (
        <p className="py-2 text-xs text-muted-foreground">{t("noRegionsInCountry")}</p>
      ) : visible.length === 0 ? (
        <p className="py-2 text-xs text-pretty text-muted-foreground">{t("noMatchingRegions", { query: query.trim() })}</p>
      ) : (
        <div className="-mx-1 max-h-64 overflow-y-auto">
          <ul aria-labelledby="region-editor-regions" className="flex flex-col gap-0.5 px-1">
            {visible.map((region) => {
              const current = region.id === currentRegionId;
              return (
                <li key={region.id}>
                  <button
                    type="button"
                    aria-current={current ? "true" : undefined}
                    onClick={() => onSelectRegion(region.id)}
                    className={cn(
                      "relative flex h-8 w-full items-center gap-2 rounded-md ps-3 pe-2 text-start transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                      "before:absolute before:inset-y-1.5 before:start-1 before:w-[3px] before:rounded-full before:bg-transparent before:transition-colors",
                      current ? "bg-accent before:bg-primary" : "hover:bg-muted",
                    )}
                  >
                    <span
                      className={cn("min-w-0 flex-1 truncate text-sm", current ? "font-semibold text-accent-foreground" : "font-medium")}
                    >
                      {region.label}
                    </span>
                    {region.mapped ? null : (
                      <span className="shrink-0 rounded-full bg-warning-muted px-1.5 text-xs font-medium">{t("notMapped")}</span>
                    )}
                    {region.active ? null : (
                      <span className="shrink-0 rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">{t("inactive")}</span>
                    )}
                    {region.code ? <span className="tabular shrink-0 text-xs text-muted-foreground">{region.code}</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
