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
  for (const b of day.blocks) {
    const v = b.kind === "unavailable" ? S_UNAVAIL : S_ONLINE;
    for (let s = b.start; s < b.end && s < SLOTS_PER_DAY; s++) st[s] = v;
  }
  return st;
}

const stateToStatus = (v: number): PaintStatus =>
  v === S_UNAVAIL ? "unavailable" : v === S_ONLINE ? "online" : "available";
const statusToState = (s: PaintStatus): number =>
  s === "unavailable" ? S_UNAVAIL : s === "online" ? S_ONLINE : S_AVAILABLE;

export function DayColumn({
  dayIndex,
  day,
  config,
  offending,
  onPaint,
}: {
  dayIndex: number;
  day: DayState;
  config: RuleConfig;
  offending: Set<number>;
  onPaint: (dayIndex: number, start: number, end: number, status: PaintStatus) => void;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ anchor: number; status: PaintStatus; moved: boolean } | null>(null);
  const [draft, setDraft] = useState<{ start: number; end: number; status: PaintStatus } | null>(null);

  const slotAt = (clientY: number) => {
    const rect = bodyRef.current!.getBoundingClientRect();
    const h = rect.height / SLOTS_PER_DAY;
    return Math.max(0, Math.min(SLOTS_PER_DAY - 1, Math.floor((clientY - rect.top) / h)));
  };

  const states = slotStates(day);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const slot = slotAt(e.clientY);
    drag.current = { anchor: slot, status: stateToStatus(states[slot]), moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const slot = slotAt(e.clientY);
    if (slot !== d.anchor) d.moved = true;
    if (d.moved) {
      setDraft({ start: Math.min(d.anchor, slot), end: Math.max(d.anchor, slot) + 1, status: d.status });
    }
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    setDraft(null);
    if (!d) return;
    if (d.moved && draft) {
      onPaint(dayIndex, draft.start, draft.end, d.status);
    } else {
      onPaint(dayIndex, d.anchor, d.anchor + 1, cycleStatus(d.status, config.supportsOnline));
    }
  };

  return (
    <div
      ref={bodyRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className="relative flex cursor-pointer touch-none flex-col select-none"
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
                unavail ? "bg-[#e8134e]" : "bg-zinc-200/70",
                bad && "ring-2 ring-amber-500",
                inDraft && "opacity-80 ring-2 ring-inset ring-black/20",
              )}
            >
              {online && (
                <span className="size-2 rounded-full bg-emerald-500 shadow-sm duration-150 animate-in zoom-in-50 sm:size-3.5" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
