"use client";

import { Maximize2, Minus, PanelRightClose, PanelRightOpen, Plus, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function ControlButton({
  label,
  icon: Icon,
  onClick,
  mirrored,
  shortcut,
  keyShortcuts,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  mirrored?: boolean;
  shortcut?: string;
  keyShortcuts?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={label}
            aria-keyshortcuts={keyShortcuts}
            onClick={onClick}
            className="size-8 rounded-md lg:size-9"
          />
        }
      >
        <Icon className={mirrored ? "size-4 rtl:-scale-x-100" : "size-4"} aria-hidden />
      </TooltipTrigger>
      <TooltipContent side="inline-start">
        {shortcut ? (
          <span className="flex items-center gap-2">
            {label}
            <kbd className="rounded border border-background/30 px-1 text-xs">{shortcut}</kbd>
          </span>
        ) : (
          label
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export function MapControls({
  onZoomIn,
  onZoomOut,
  onFit,
  panelOpen,
  onTogglePanel,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  panelOpen?: boolean;
  onTogglePanel?: () => void;
}) {
  const t = useTranslations("locations.editor");
  return (
    <TooltipProvider>
      <div className="flex flex-col gap-0.5 rounded-lg bg-card p-0.5 shadow-sm ring-1 ring-foreground/10">
        <ControlButton label={t("zoomIn")} icon={Plus} onClick={onZoomIn} shortcut="+" keyShortcuts="Plus =" />
        <ControlButton label={t("zoomOut")} icon={Minus} onClick={onZoomOut} shortcut="-" keyShortcuts="-" />
        <ControlButton label={t("fitRegion")} icon={Maximize2} onClick={onFit} shortcut="F" keyShortcuts="F" />
        {onTogglePanel ? (
          <ControlButton
            label={panelOpen ? t("hidePanel") : t("showPanel")}
            icon={panelOpen ? PanelRightClose : PanelRightOpen}
            onClick={onTogglePanel}
            mirrored
          />
        ) : null}
      </div>
    </TooltipProvider>
  );
}
