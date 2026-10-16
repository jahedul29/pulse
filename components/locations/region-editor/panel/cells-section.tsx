"use client";

import { Redo2, TriangleAlert, Undo2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ButtonRow } from "@/components/ui/button-row";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { fmtCount, fmtDateTime } from "@/lib/format";
import { isApplePlatform } from "@/lib/platform";
import type { SelectionSnapshot } from "@/lib/region-builder/selection";

export function CellsSection({
  snapshot,
  lastSavedAt,
  saving,
  lockReason,
  onSave,
  onRevert,
  onDropAll,
  onUndo,
  onRedo,
}: {
  snapshot: SelectionSnapshot;
  lastSavedAt: number | null;
  saving: boolean;
  lockReason: string | null;
  onSave: () => void;
  onRevert: () => void;
  onDropAll: () => void;
  onUndo: () => void;
  onRedo: () => void;
}) {
  const t = useTranslations("locations.editor");
  const locale = useLocale();
  const saveBlockedByEmpty = snapshot.dirty && snapshot.count === 0;
  const apple = isApplePlatform();
  const modifier = apple ? "⌘" : "Ctrl+";
  const locked = lockReason !== null;

  return (
    <section aria-label={t("cellsTitle")} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="tabular font-heading text-xl leading-7 font-semibold">
          {t("cellCount", { count: snapshot.count, formatted: fmtCount(snapshot.count, locale) })}
        </span>
        {snapshot.dirty ? (
          <span className="flex items-center gap-1.5 rounded-full bg-warning-muted px-2.5 py-1 text-xs font-medium">
            <TriangleAlert className="size-3.5 text-warning" aria-hidden />
            {t("unsaved")}
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
        {snapshot.dirty ? (
          <>
            {snapshot.addedCount > 0 ? (
              <span className="tabular rounded-full bg-success-muted px-2 py-0.5 font-medium">
                {t("added", { count: fmtCount(snapshot.addedCount, locale) })}
              </span>
            ) : null}
            {snapshot.removedCount > 0 ? (
              <span className="tabular rounded-full bg-danger-muted px-2 py-0.5 font-medium">
                {t("dropped", { count: fmtCount(snapshot.removedCount, locale) })}
              </span>
            ) : null}
            {snapshot.centreChanged ? (
              <span className="rounded-full bg-accent px-2 py-0.5 font-medium text-accent-foreground">{t("centreMoved")}</span>
            ) : null}
          </>
        ) : (
          <span className="text-muted-foreground">
            {lastSavedAt ? t("lastSaved", { date: fmtDateTime(lastSavedAt, locale) }) : t("neverSaved")}
          </span>
        )}
      </div>
      {saveBlockedByEmpty ? <p className="text-xs text-pretty text-danger">{t("saveNeedsCell")}</p> : null}
      <TooltipProvider>
        <div className="flex items-center gap-1 pt-1">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("undo")}
                  aria-keyshortcuts={apple ? "Meta+Z" : "Control+Z"}
                  focusableWhenDisabled
                  disabled={!snapshot.canUndo || locked}
                  onClick={onUndo}
                  className="data-[disabled]:hover:bg-transparent"
                />
              }
            >
              <Undo2 className="rtl:-scale-x-100" aria-hidden />
            </TooltipTrigger>
            <TooltipContent>{lockReason ?? `${t("undo")} (${modifier}Z)`}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("redo")}
                  aria-keyshortcuts={apple ? "Meta+Shift+Z" : "Control+Shift+Z"}
                  focusableWhenDisabled
                  disabled={!snapshot.canRedo || locked}
                  onClick={onRedo}
                  className="data-[disabled]:hover:bg-transparent"
                />
              }
            >
              <Redo2 className="rtl:-scale-x-100" aria-hidden />
            </TooltipTrigger>
            <TooltipContent>{lockReason ?? `${t("redo")} (${modifier}${apple ? "⇧Z" : "Shift+Z"})`}</TooltipContent>
          </Tooltip>
          <ButtonRow layout="split" className="ms-auto flex-1 sm:flex-none">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="md"
                    onClick={onRevert}
                    focusableWhenDisabled
                    disabled={!snapshot.dirty || locked}
                    className="data-[disabled]:hover:bg-background"
                  />
                }
              >
                {t("revert")}
              </TooltipTrigger>
              <TooltipContent>{lockReason ?? t("revert")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    size="md"
                    onClick={onSave}
                    loading={saving}
                    focusableWhenDisabled
                    disabled={locked || !snapshot.dirty || saveBlockedByEmpty}
                    aria-keyshortcuts={apple ? "Meta+S" : "Control+S"}
                    className="data-[disabled]:hover:bg-primary"
                  />
                }
              >
                {t("save")}
              </TooltipTrigger>
              <TooltipContent>{lockReason ?? `${t("save")} (${modifier}S)`}</TooltipContent>
            </Tooltip>
          </ButtonRow>
        </div>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="xs"
                className="w-fit self-end text-danger hover:bg-danger-muted hover:text-danger data-[disabled]:hover:bg-transparent"
                onClick={onDropAll}
                focusableWhenDisabled
                disabled={snapshot.count === 0 || locked}
              />
            }
          >
            {t("dropAll")}
          </TooltipTrigger>
          <TooltipContent>{lockReason ?? t("dropAll")}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </section>
  );
}
