"use client";

import { Ban, RotateCcw, Save, SlidersHorizontal, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fmtDuration } from "@/lib/availability/constants";
import type { MarkKind, RuleConfig } from "@/lib/availability/types";

export function ControlBar({
  config,
  activeKind,
  onActiveKindChange,
  onOpenRules,
  onReset,
  onSave,
}: {
  config: RuleConfig;
  activeKind: MarkKind;
  onActiveKindChange: (kind: MarkKind) => void;
  onOpenRules: () => void;
  onReset: () => void;
  onSave: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {config.supportsOnline ? (
        <div className="flex items-center gap-1 rounded-lg border bg-card p-0.5">
          <span className="px-1.5 text-xs text-muted-foreground">Mark:</span>
          <SegButton active={activeKind === "unavailable"} onClick={() => onActiveKindChange("unavailable")}>
            <Ban className="size-3.5" /> Unavailable
          </SegButton>
          <SegButton active={activeKind === "online"} onClick={() => onActiveKindChange("online")}>
            <Video className="size-3.5" /> Online only
          </SegButton>
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">
          Drag on a day to mark <span className="font-medium text-danger">unavailable</span> time.
        </span>
      )}

      <div className="hidden flex-wrap items-center gap-1.5 md:flex">
        <Chip>
          Block ≥ {fmtDuration(config.minBlockInPersonMins)}
          {config.supportsOnline ? ` / ${fmtDuration(config.minBlockOnlineMins)}` : ""}
        </Chip>
        <Chip>Break ≥ {fmtDuration(config.minBreakMins)}</Chip>
        <Chip>Window ≥ {fmtDuration(config.continuousWindowMins)}</Chip>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onOpenRules}>
          <SlidersHorizontal className="size-3.5" /> Update calendar rules
        </Button>
        <Button variant="ghost" size="sm" onClick={onReset} aria-label="Reset calendar availability">
          <RotateCcw className="size-3.5" /> Reset calendar
        </Button>
        <Button size="sm" onClick={onSave}>
          <Save className="size-3.5" /> Save
        </Button>
      </div>
    </div>
  );
}

function SegButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="tabular rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
      {children}
    </span>
  );
}
