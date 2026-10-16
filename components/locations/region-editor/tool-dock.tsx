"use client";

import { useRef, type KeyboardEvent } from "react";
import { Circle, Hand, Paintbrush, Pentagon, Square, type LucideIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { fmtCount } from "@/lib/format";
import { EDITOR_TOOLS, TOOL_KEY_LABELS, type EditorTool } from "@/lib/region-builder/tools";
import { cn } from "@/lib/utils";

const TOOL_ICONS: Record<EditorTool, LucideIcon> = {
  pan: Hand,
  click: Paintbrush,
  rectangle: Square,
  ellipse: Circle,
  polygon: Pentagon,
};

export interface PolygonControls {
  corners: number;
  finishDisabled: boolean;
  onFinish: () => void;
  onUndoPoint: () => void;
  onCancel: () => void;
}

export function PolygonBar({ corners, finishDisabled, onFinish, onUndoPoint, onCancel }: PolygonControls) {
  const t = useTranslations("locations.editor");
  const locale = useLocale();
  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-card p-0.5 ps-3 shadow-sm ring-1 ring-foreground/10">
      <span className="tabular me-1.5 shrink-0 text-sm font-medium">
        {t("polygonCorners", { count: corners, formatted: fmtCount(corners, locale) })}
      </span>
      <Button size="md" className="rounded-md lg:h-9" onClick={onFinish} disabled={finishDisabled || corners < 3} aria-keyshortcuts="Enter">
        {t("polygonFinish")}
      </Button>
      <Button size="md" variant="ghost" className="rounded-md lg:h-9" onClick={onUndoPoint} aria-keyshortcuts="Backspace">
        {t("polygonUndoPoint")}
      </Button>
      <Button size="md" variant="ghost" className="rounded-md lg:h-9" onClick={onCancel} aria-keyshortcuts="Escape">
        {t("polygonCancel")}
      </Button>
    </div>
  );
}

export function ToolDock({
  tool,
  onToolChange,
  disabledReason,
  className,
}: {
  tool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
  disabledReason?: string | null;
  className?: string;
}) {
  const t = useTranslations("locations.editor");
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const rtl = document.documentElement.dir === "rtl";
    const forward = (event.key === "ArrowRight") !== rtl;
    const buttons = buttonsRef.current.filter((button): button is HTMLButtonElement => Boolean(button));
    const current = buttons.findIndex((button) => button === document.activeElement);
    buttons[(current + (forward ? 1 : -1) + buttons.length) % buttons.length]?.focus();
  };

  return (
    <TooltipProvider>
      <div
        className={cn(
          "flex items-center rounded-lg bg-card p-0.5 shadow-sm ring-1 ring-foreground/10",
          className,
        )}
      >
        <div role="toolbar" aria-label={t("toolsLabel")} onKeyDown={onKeyDown} className="flex items-center gap-0.5">
          {EDITOR_TOOLS.map((value, index) => {
            const Icon = TOOL_ICONS[value];
            const active = tool === value;
            const disabled = value !== "pan" && Boolean(disabledReason);
            return (
              <Tooltip key={value}>
                <TooltipTrigger
                  render={
                    <Button
                      ref={(button: HTMLButtonElement | null) => {
                        buttonsRef.current[index] = button;
                      }}
                      variant="ghost"
                      size="md"
                      aria-pressed={active}
                      aria-label={t(`tool_${value}`)}
                      aria-keyshortcuts={TOOL_KEY_LABELS[value]}
                      tabIndex={active ? 0 : -1}
                      focusableWhenDisabled
                      disabled={disabled}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => onToolChange(active && value !== "pan" ? "pan" : value)}
                      className={cn(
                        "size-8 rounded-md px-0 lg:size-9",
                        active && value === "pan" && "bg-muted text-foreground",
                        active &&
                          value !== "pan" &&
                          "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
                      )}
                    />
                  }
                >
                  <Icon className="size-4" aria-hidden />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-64">
                  {disabled ? (
                    disabledReason
                  ) : (
                    <span className="flex flex-col gap-1">
                      <span className="flex items-center gap-2">
                        {t(`tool_${value}`)}
                        <kbd className="rounded border border-background/30 px-1 text-xs">{TOOL_KEY_LABELS[value]}</kbd>
                      </span>
                      <span className="font-normal text-pretty text-background/75">{t(`hint_${value}`)}</span>
                    </span>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
