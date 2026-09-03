"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { SLOTS_PER_DAY } from "@/lib/availability/constants";
import { cycleStatus } from "@/lib/availability/rules";
import type { DayState, PaintStatus, RuleConfig } from "@/lib/availability/types";

const S_AVAILABLE = 0;
const S_ONLINE = 1;
const S_UNAVAIL = 2;

function slotStates(day: DayState): Uint8Array {
  const st = new Uint8Array(SLOTS_PER_DAY);
  for (const block of day.blocks) {
    const stateValue = block.kind === "unavailable" ? S_UNAVAIL : S_ONLINE;
    for (let slot = block.start; slot < block.end && slot < SLOTS_PER_DAY; slot++) st[slot] = stateValue;
  }
  return st;
}

const stateToStatus = (stateValue: number): PaintStatus =>
  stateValue === S_UNAVAIL ? "unavailable" : stateValue === S_ONLINE ? "online" : "available";
const statusToState = (status: PaintStatus): number =>
  status === "unavailable" ? S_UNAVAIL : status === "online" ? S_ONLINE : S_AVAILABLE;

export function DayColumn({
  dayIndex,
  day,
  config,
  offending,
  shakeKey = 0,
  onPaint,
}: {
  dayIndex: number;
  day: DayState;
  config: RuleConfig;
  offending: Set<number>;
  shakeKey?: number;
  onPaint: (dayIndex: number, start: number, end: number, status: PaintStatus) => void;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ anchor: number; paint: PaintStatus; moved: boolean } | null>(null);
  const [draft, setDraft] = useState<{ start: number; end: number; status: PaintStatus } | null>(null);

  const slotAt = (clientY: number) => {
    const rect = bodyRef.current!.getBoundingClientRect();
    const slotHeight = rect.height / SLOTS_PER_DAY;
    return Math.max(0, Math.min(SLOTS_PER_DAY - 1, Math.floor((clientY - rect.top) / slotHeight)));
  };

  const states = slotStates(day);

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0) return;
    const slot = slotAt(event.clientY);
    const next = cycleStatus(stateToStatus(states[slot]), config.supportsOnline);
    drag.current = { anchor: slot, paint: next, moved: false };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: React.PointerEvent) => {
    const activeDrag = drag.current;
    if (!activeDrag) return;
    const slot = slotAt(event.clientY);
    if (slot !== activeDrag.anchor) activeDrag.moved = true;
    if (activeDrag.moved) {
      setDraft({ start: Math.min(activeDrag.anchor, slot), end: Math.max(activeDrag.anchor, slot) + 1, status: activeDrag.paint });
    }
  };
  const onPointerUp = () => {
    const activeDrag = drag.current;
    drag.current = null;
    setDraft(null);
    if (!activeDrag) return;
    if (activeDrag.moved && draft) {
      onPaint(dayIndex, draft.start, draft.end, activeDrag.paint);
    } else {
      onPaint(dayIndex, activeDrag.anchor, activeDrag.anchor + 1, activeDrag.paint);
    }
  };

  return (
    <div
      key={shakeKey}
      ref={bodyRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className={cn(
        "relative flex cursor-pointer touch-none flex-col select-none",
        shakeKey > 0 && "animate-rule-shake motion-reduce:animate-none",
      )}
      style={{ height: `calc(var(--slot) * ${SLOTS_PER_DAY})` }}
    >
      {Array.from({ length: SLOTS_PER_DAY }, (_, i) => {
        const inDraft = draft && i >= draft.start && i < draft.end;
        const state = inDraft ? statusToState(draft.status) : states[i];
        const online = state === S_ONLINE;
        const unavail = state === S_UNAVAIL;
        const bad = offending.has(i) && !inDraft;
        return (
          <div key={i} className="px-0.5 py-px sm:px-1" style={{ height: "var(--slot)" }}>
            <div
              className={cn(
                "flex h-full items-center justify-center rounded-[12px] transition-colors duration-150 ease-out motion-reduce:transition-none",
                unavail ? "bg-danger" : "bg-muted",
                bad && "ring-2 ring-amber-500",
                inDraft && "opacity-80 ring-2 ring-inset ring-black/20",
              )}
            >
              {online && (
                <span className="size-2 rounded-full bg-chart-3 shadow-sm duration-150 animate-in zoom-in-50 sm:size-3.5" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
