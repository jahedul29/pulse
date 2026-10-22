"use client";

import { useEffect, useRef } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { isApplePlatform } from "@/lib/platform";
import { useIsClient } from "@/lib/use-is-client";
import type { PagerDirection, RecordPager as RecordPagerState } from "@/lib/use-record-pager";
import { cn } from "@/lib/utils";

const DIALOG = '[role="dialog"], [role="alertdialog"]';

function ignoredTarget(target: EventTarget | null, home: Element | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return true;
  if (target.closest('[role="combobox"], [role="listbox"], [role="menu"]')) return true;
  const dialog = target.closest(DIALOG);
  return dialog != null && dialog !== home?.closest(DIALOG);
}

export function RecordPager({
  pager,
  disabledReason,
  className,
}: {
  pager: RecordPagerState;
  disabledReason?: string;
  className?: string;
}) {
  const tc = useTranslations("common");
  const isClient = useIsClient();
  const modifier = isClient && isApplePlatform() ? "⌥" : "Alt";
  const { step } = pager;
  const root = useRef<HTMLDivElement>(null);
  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || !event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      if (ignoredTarget(event.target, root.current)) return;
      event.preventDefault();
      stepRef.current(event.key === "ArrowDown" ? 1 : -1);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  if (pager.position === 0) return null;

  const control = (direction: PagerDirection) => {
    const label = tc(direction === 1 ? "nextRecord" : "prevRecord");
    const shortcut = `${modifier} ${direction === 1 ? "↓" : "↑"}`;
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              focusableWhenDisabled
              onClick={() => step(direction)}
              disabled={direction === 1 ? !pager.canNext : !pager.canPrev}
              loading={pager.pending === direction}
              aria-label={label}
              aria-keyshortcuts={direction === 1 ? "Alt+ArrowDown" : "Alt+ArrowUp"}
            />
          }
        >
          {direction === 1 ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
        </TooltipTrigger>
        <TooltipContent>
          {disabledReason ?? (
            <>
              {label} <kbd className="ms-1 font-sans text-xs opacity-70">{shortcut}</kbd>
            </>
          )}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <div ref={root} role="group" aria-label={tc("recordPager")} className={cn("flex items-center gap-1 pe-8", className)}>
      {control(-1)}
      <span className="text-xs text-muted-foreground tabular" aria-live="polite">
        {tc("recordPosition", { index: pager.position, total: pager.total })}
      </span>
      {control(1)}
    </div>
  );
}
