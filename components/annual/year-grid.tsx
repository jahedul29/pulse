"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { eachDayOfInterval, format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { MONTH_LABELS, WEEKDAY_LABELS } from "@/lib/annual/constants";
import { buildYearGrid, dayAt, isoOf } from "@/lib/annual/grid";

const VARS =
  "[--awc-lead:53px] [--awc-col:26px] [--awc-row:20px] [--awc-pill:18px] " +
  "sm:[--awc-lead:66px] sm:[--awc-col:33px] sm:[--awc-row:25px] sm:[--awc-pill:22px] " +
  "md:[--awc-lead:80px] md:[--awc-col:40px] md:[--awc-row:30px] md:[--awc-pill:26px]";

const COLS = "grid-cols-[var(--awc-lead)_repeat(12,var(--awc-col))]";

function rangeIso(a: string, b: string): string[] {
  const [lo, hi] = a <= b ? [a, b] : [b, a];
  return eachDayOfInterval({ start: parseISO(lo), end: parseISO(hi) }).map((d) =>
    format(d, "yyyy-MM-dd"),
  );
}

export function YearGrid({
  year,
  offSet,
  todayIso,
  onCommit,
  onYearClick,
}: {
  year: number;
  offSet: Set<string>;
  todayIso: string;
  onCommit: (dates: string[], makeUnavailable: boolean) => void;
  onYearClick: () => void;
}) {
  const grid = useMemo(() => buildYearGrid(year), [year]);
  const drag = useRef<{
    anchor: string;
    makeUnavailable: boolean;
    touch: boolean;
    range: Set<string>;
  } | null>(null);
  const [draft, setDraft] = useState<{ set: Set<string>; makeUnavailable: boolean } | null>(null);

  const isEditable = (iso: string) => iso >= todayIso;

  useEffect(() => {
    const isoUnder = (x: number, y: number): string | null => {
      const el = document.elementFromPoint(x, y) as HTMLElement | null;
      return el?.closest<HTMLElement>("[data-iso]")?.dataset.iso ?? null;
    };
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const iso = isoUnder(e.clientX, e.clientY);
      if (!iso || iso === d.anchor) return;
      if (d.touch) {
        drag.current = null;
        setDraft(null);
        return;
      }
      d.range = new Set(rangeIso(d.anchor, iso));
      setDraft({ set: d.range, makeUnavailable: d.makeUnavailable });
    };
    const up = () => {
      const d = drag.current;
      drag.current = null;
      if (!d) return;
      setDraft(null);
      const dates = [...d.range].filter(isEditable);
      if (dates.length) onCommit(dates, d.makeUnavailable);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayIso, onCommit]);

  const startDrag = (iso: string, touch: boolean) => {
    if (!isEditable(iso)) return;
    const makeUnavailable = !offSet.has(iso);
    const range = new Set([iso]);
    drag.current = { anchor: iso, makeUnavailable, touch, range };
    setDraft({ set: range, makeUnavailable });
  };

  const cells: React.ReactNode[] = [];
  for (let r = 0; r < grid.rows; r++) {
    const wd = r % 7;
    const weekend = wd >= 5;
    cells.push(
      <div key={`ax-${r}`} className="flex h-[var(--awc-row)] items-center">
        <span
          className={cn(
            "inline-flex h-[calc(var(--awc-row)-2px)] items-center rounded-[6px] px-1 text-[10px] font-semibold tracking-wide text-primary sm:px-1.5 sm:text-[11px] md:text-[13px]",
            weekend && "bg-[#e7e6e6]",
          )}
        >
          {WEEKDAY_LABELS[wd]}
        </span>
      </div>,
    );
    for (let m = 0; m < 12; m++) {
      const day = dayAt(grid, m, r);
      if (day == null) {
        cells.push(<div key={`c-${r}-${m}`} className="h-[var(--awc-row)]" />);
        continue;
      }
      const iso = isoOf(year, m, day);
      const past = !isEditable(iso);
      const inDraft = !past && draft?.set.has(iso);
      const off = inDraft ? draft!.makeUnavailable : offSet.has(iso);
      cells.push(
        <div key={`c-${r}-${m}`} className="flex h-[var(--awc-row)] items-center justify-center">
          <button
            type="button"
            data-iso={past ? undefined : iso}
            disabled={past}
            onPointerDown={(e) => {
              if (e.pointerType === "mouse" && e.button !== 0) return;
              startDrag(iso, e.pointerType === "touch");
            }}
            className={cn(
              "tabular grid size-[var(--awc-pill)] place-items-center rounded-[6px] text-[8px] leading-none font-semibold transition-colors duration-100 select-none sm:text-[10px] md:text-[12px]",
              past
                ? "cursor-default bg-[#f7f7f7] text-[#c4c4c4]"
                : off
                  ? "cursor-pointer bg-danger text-danger-foreground"
                  : weekend
                    ? "cursor-pointer bg-[#e7e6e6] text-foreground hover:bg-[#dbdada]"
                    : "cursor-pointer bg-[#f2f2f2] text-foreground hover:bg-[#e7e6e6]",
              inDraft && "ring-2 ring-inset ring-black/15",
            )}
          >
            {day}
          </button>
        </div>,
      );
    }
  }

  return (
    <div className={cn("mx-auto w-max select-none", VARS)}>
      <div
        className={cn(
          "sticky top-0 z-10 mb-1 grid items-center rounded-full bg-card shadow-md ring-1 ring-foreground/5",
          COLS,
        )}
      >
        <button
          type="button"
          onClick={onYearClick}
          className="tabular flex h-[var(--awc-row)] w-[46px] cursor-pointer items-center justify-center rounded-full bg-primary text-[13px] font-bold text-primary-foreground transition-colors hover:bg-primary/90 sm:w-[56px] sm:text-sm md:w-[68px] md:text-[15px]"
        >
          {year}
        </button>
        {MONTH_LABELS.map((label) => (
          <div
            key={label}
            className="text-center text-[10px] font-semibold tracking-tight text-primary sm:text-[11px] md:text-[13px]"
          >
            {label}
          </div>
        ))}
      </div>

      <div className={cn("grid auto-rows-[var(--awc-row)]", COLS)}>{cells}</div>
    </div>
  );
}
