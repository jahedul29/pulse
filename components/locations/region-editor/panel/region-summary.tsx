"use client";

import { useState } from "react";
import { ChevronDown, Earth, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Chip } from "@/components/common/chip";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { CountryOption } from "../../use-country-options";
import { RegionNavigator, type NavigatorRegion } from "./region-navigator";

export function RegionSummary({
  name,
  alternateName,
  code,
  active,
  regionId,
  countries,
  countryId,
  onCountryChange,
  regions,
  onSelectRegion,
  onCreateRegion,
  canEdit,
  noPermissionLabel,
  onEdit,
  onDelete,
}: {
  name: string;
  alternateName?: string | null;
  code?: string | null;
  active: boolean;
  regionId: number;
  countries: CountryOption[];
  countryId: number | null;
  onCountryChange: (id: number) => void;
  regions: NavigatorRegion[];
  onSelectRegion: (id: number) => void;
  onCreateRegion: () => void;
  canEdit: boolean;
  noPermissionLabel: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("locations.editor");
  const [pickerOpen, setPickerOpen] = useState(false);
  const countryLabel = countries.find((country) => country.id === countryId)?.label ?? "";

  return (
    <div className="flex flex-col gap-1 px-4 pt-2.5 pb-3">
      <div className="flex items-center justify-between gap-2">
        <Select
          value={countryId === null ? null : String(countryId)}
          onValueChange={(value) => {
            if (!value) return;
            onCountryChange(Number(value));
            setPickerOpen(true);
          }}
        >
          <SelectTrigger
            size="xs"
            aria-label={t("countryLabel")}
            className="-ms-1.5 max-w-[70%] gap-1 border-transparent px-1.5 text-xs text-muted-foreground shadow-none hover:bg-muted hover:text-foreground"
          >
            <Earth className="size-3.5" aria-hidden />
            <SelectValue>{(value) => countries.find((country) => String(country.id) === value)?.label ?? ""}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {countries.map((country) => (
              <SelectItem key={country.id} value={String(country.id)}>
                {country.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <TooltipProvider>
          <div className="flex shrink-0 items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("editDetailsShort")}
                    focusableWhenDisabled
                    disabled={!canEdit}
                    onClick={onEdit}
                    className="data-[disabled]:hover:bg-transparent"
                  />
                }
              >
                <Pencil aria-hidden />
              </TooltipTrigger>
              <TooltipContent>{canEdit ? t("editDetailsShort") : noPermissionLabel}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("deleteRegion")}
                    focusableWhenDisabled
                    disabled={!canEdit}
                    onClick={onDelete}
                    className="text-muted-foreground hover:bg-danger-muted hover:text-danger data-[disabled]:hover:bg-transparent data-[disabled]:hover:text-muted-foreground"
                  />
                }
              >
                <Trash2 aria-hidden />
              </TooltipTrigger>
              <TooltipContent>{canEdit ? t("deleteRegion") : noPermissionLabel}</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              aria-label={t("switchRegionNamed", { name })}
              className="group -mx-1.5 flex max-w-full items-center gap-1.5 self-start rounded-md px-1.5 py-0.5 text-start transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40 data-[popup-open]:bg-muted"
            />
          }
        >
          <span className="truncate font-heading text-base leading-6 font-semibold">{name}</span>
          <ChevronDown
            className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[popup-open]:rotate-180 motion-reduce:transition-none"
            aria-hidden
          />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(20.5rem,calc(100vw-2rem))] p-3">
          <RegionNavigator
            countryLabel={countryLabel}
            regions={regions}
            currentRegionId={regionId}
            onSelectRegion={(id) => {
              setPickerOpen(false);
              onSelectRegion(id);
            }}
            onCreateRegion={() => {
              setPickerOpen(false);
              onCreateRegion();
            }}
            canEdit={canEdit}
            noPermissionLabel={noPermissionLabel}
          />
        </PopoverContent>
      </Popover>

      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        {alternateName ? (
          <span className="truncate text-sm text-muted-foreground" dir="auto">
            {alternateName}
          </span>
        ) : null}
        {code ? (
          <Chip variant="outline" className="tabular">
            {code}
          </Chip>
        ) : null}
        <StatusBadge tone={active ? "success" : "neutral"} equalWidth={false}>
          {active ? t("active") : t("inactive")}
        </StatusBadge>
      </div>
    </div>
  );
}
