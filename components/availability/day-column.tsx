"use client";

import { useRef, useState } from "react";
import { Ban, Video, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SLOTS_PER_DAY, SLOT_MINS, slotToTime, fmtDuration } from "@/lib/availability/constants";
import { placeMinUnavailable } from "@/lib/availability/rules";
import type { Block, DayState, MarkKind, RuleConfig } from "@/lib/availability/types";

export const SLOT_PX = 28;

type Resize = { index: number; edge: "top" | "bottom"; start: number; end: number };

function minPaintSlots(kind: MarkKind, config: RuleConfig): number {
  const mins = kind === "online" ? config.minBlockOnlineMins : config.minBreakMins;
  return Math.max(1, Math.round(mins / SLOT_MINS));
}

export function DayColumn({
  dayIndex,
  day,
  config,
  activeKind,
  offending,
  onAddBlock,
  onRemoveBlock,
  onResizeBlock,
  onFocus,
}: {
  dayIndex: number;
  day: DayState;
  config: RuleConfig;
  activeKind: MarkKind;
  offending: Set<number>;
  onAddBlock: (dayIndex: number, draft: Block) => void;
  onRemoveBlock: (dayIndex: number, index: number) => void;
  onResizeBlock: (dayIndex: number, index: number, start: number, end: number) => void;
  onFocus: () => void;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<{ anchor: number; current: number } | null>(null);
  const [resize, setResize] = useState<Resize | null>(null);

  const slotAt = (clientY: number) => {
    const rect = bodyRef.current!.getBoundingClientRect();
    const y = clientY - rect.top;
    return Math.max(0, Math.min(SLOTS_PER_DAY - 1, Math.floor(y / SLOT_PX)));
  };

  const startResize = (e: React.PointerEvent, index: number, edge: "top" | "bottom") => {
    e.stopPropagation();
    const b = day.blocks[index];
    setResize({ index, edge, start: b.start, end: b.end });
    bodyRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    onFocus();
    const slot = slotAt(e.clientY);
    setDraft({ anchor: slot, current: slot });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (resize) {
      const slot = slotAt(e.clientY);
      setResize((r) => {
        if (!r) return r;
        return r.edge === "top"
          ? { ...r, start: Math.max(0, Math.min(slot, r.end - 1)) }
          : { ...r, end: Math.min(SLOTS_PER_DAY, Math.max(slot + 1, r.start + 1)) };
      });
      return;
    }
    if (draft) setDraft({ anchor: draft.anchor, current: slotAt(e.clientY) });
  };
  const computePlacement = (s: number, e: number): { start: number; end: number } => {
    if (activeKind === "unavailable") {
      const T = minPaintSlots("unavailable", config);
      return e - s < T ? placeMinUnavailable(day, s, e, config) : { start: s, end: e };
    }
    const min = minPaintSlots("online", config);
    if (e - s < min) {
      const end = Math.min(SLOTS_PER_DAY, s + min);
      return { start: Math.max(0, end - min), end };
    }
    return { start: s, end: e };
  };

  const onPointerUp = () => {
    if (resize) {
      onResizeBlock(dayIndex, resize.index, resize.start, resize.end);
      setResize(null);
      return;
    }
    if (!draft) return;
    const s = Math.min(draft.anchor, draft.current);
    const e = Math.max(draft.anchor, draft.current) + 1;
    const p = computePlacement(s, e);
    onAddBlock(dayIndex, { start: p.start, end: p.end, kind: activeKind });
    setDraft(null);
  };

  const draftRange = draft
    ? computePlacement(
        Math.min(draft.anchor, draft.current),
        Math.max(draft.anchor, draft.current) + 1,
      )
    : null;
  const draftOnline = activeKind === "online";

  return (
    <div
      ref={bodyRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className="relative cursor-crosshair touch-none border-l border-border/70 select-none"
      style={{
        height: SLOTS_PER_DAY * SLOT_PX,
        backgroundImage: [
          `repeating-linear-gradient(to bottom, transparent, transparent ${SLOT_PX * 4 - 1}px, var(--border) ${SLOT_PX * 4 - 1}px, var(--border) ${SLOT_PX * 4}px)`,
          `repeating-linear-gradient(to bottom, transparent, transparent ${SLOT_PX - 1}px, color-mix(in oklch, var(--border) 45%, transparent) ${SLOT_PX - 1}px, color-mix(in oklch, var(--border) 45%, transparent) ${SLOT_PX}px)`,
        ].join(", "),
      }}
    >
      {day.blocks.map((b, i) => {
        const bad = offending.has(i);
        const online = b.kind === "online";
        const live = resize && resize.index === i ? resize : b;
        const start = live.start;
        const end = live.end;
        return (
          <div
            key={`${b.start}-${b.end}-${b.kind}`}
            className={cn(
              "group/block absolute inset-x-1 overflow-hidden rounded-sm px-1.5 py-0.5 text-[10px] leading-tight shadow-sm ring-1",
              online
                ? "bg-success text-success-foreground ring-success/30"
                : "bg-danger text-danger-foreground ring-danger/30",
              bad && "ring-2 ring-amber-500",
            )}
            style={{ top: start * SLOT_PX, height: (end - start) * SLOT_PX }}
          >
            <div className="flex items-center gap-1 font-medium">
              {online ? <Video className="size-3" /> : <Ban className="size-3" />}
              <span className="tabular truncate">
                {slotToTime(start)}–{slotToTime(end)}
              </span>
            </div>
            {(end - start) * SLOT_PX > 34 && (
              <div
                className={cn(online ? "text-success-foreground/80" : "text-danger-foreground/85", "tabular")}
              >
                {fmtDuration((end - start) * SLOT_MINS)} · {online ? "online only" : "unavailable"}
              </div>
            )}

            <div
              onPointerDown={(e) => startResize(e, i, "top")}
              className="absolute inset-x-0 top-0 flex h-2.5 cursor-ns-resize items-start justify-center pt-0.5 opacity-0 group-hover/block:opacity-100"
            >
              <span className="h-0.5 w-6 rounded-full bg-current/60" />
            </div>
            <div
              onPointerDown={(e) => startResize(e, i, "bottom")}
              className="absolute inset-x-0 bottom-0 flex h-2.5 cursor-ns-resize items-end justify-center pb-0.5 opacity-0 group-hover/block:opacity-100"
            >
              <span className="h-0.5 w-6 rounded-full bg-current/60" />
            </div>

            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onRemoveBlock(dayIndex, i);
              }}
              className="absolute top-0.5 right-0.5 grid size-4 place-items-center rounded text-current opacity-0 transition-opacity group-hover/block:opacity-100 hover:bg-black/20"
              aria-label="Remove"
            >
              <X className="size-3" />
            </button>
          </div>
        );
      })}

      {draftRange && (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-1 rounded-sm border-2 border-dashed",
            draftOnline ? "border-success bg-success/25" : "border-danger bg-danger/25",
          )}
          style={{ top: draftRange.start * SLOT_PX, height: (draftRange.end - draftRange.start) * SLOT_PX }}
        />
      )}
    </div>
  );
}
