"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { eachDayOfInterval, format, parseISO } from "date-fns";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { buildYearGrid, dayAt, isoOf } from "@/lib/annual/grid";
import { monthShortLabels, weekdayTwoCharLabels } from "@/lib/i18n/calendar";

const VARS =
  "[--awc-lead:53px] [--awc-col:26px] [--awc-row:20px] [--awc-pill:18px] " +
  "sm:[--awc-lead:66px] sm:[--awc-col:33px] sm:[--awc-row:25px] sm:[--awc-pill:22px] " +
  "md:[--awc-lead:76px] md:[--awc-col:60px] md:[--awc-row:32px] md:[--awc-pill:28px]";

const COLS = "grid-cols-[var(--awc-lead)_repeat(12,var(--awc-col))]";

function rangeIso(firstIso: string, secondIso: string): string[] {
  const [lo, hi] = firstIso <= secondIso ? [firstIso, secondIso] : [secondIso, firstIso];
  return eachDayOfInterval({ start: parseISO(lo), end: parseISO(hi) }).map((date) =>
    format(date, "yyyy-MM-dd"),
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
  const locale = useLocale();
  const monthLabels = useMemo(() => monthShortLabels(locale), [locale]);
  const weekdayLabels = useMemo(() => weekdayTwoCharLabels(locale), [locale]);
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
    const move = (event: PointerEvent) => {
      const activeDrag = drag.current;
      if (!activeDrag) return;
      const iso = isoUnder(event.clientX, event.clientY);
      if (!iso || iso === activeDrag.anchor) return;
      if (activeDrag.touch) {
        drag.current = null;
        setDraft(null);
        return;
      }
      activeDrag.range = new Set(rangeIso(activeDrag.anchor, iso));
      setDraft({ set: activeDrag.range, makeUnavailable: activeDrag.makeUnavailable });
    };
    const up = () => {
      const activeDrag = drag.current;
      drag.current = null;
      if (!activeDrag) return;
      setDraft(null);
      const dates = [...activeDrag.range].filter(isEditable);
      if (dates.length) onCommit(dates, activeDrag.makeUnavailable);
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
  for (let row = 0; row < grid.rows; row++) {
    const wd = row % 7;
    const weekend = wd >= 5;
    cells.push(
      <div key={`ax-${row}`} className="flex h-[var(--awc-row)] items-center">
        <span
          className={cn(
            "inline-flex h-[calc(var(--awc-row)-2px)] items-center rounded-[6px] px-1 text-[10px] font-semibold tracking-wide text-primary sm:px-1.5 sm:text-[11px] md:text-[13px]",
            weekend && "bg-[#e7e6e6]",
          )}
        >
          {weekdayLabels[wd]}
        </span>
      </div>,
    );
    for (let month = 0; month < 12; month++) {
      const day = dayAt(grid, month, row);
      if (day == null) {
        cells.push(<div key={`c-${row}-${month}`} className="h-[var(--awc-row)]" />);
        continue;
      }
      const iso = isoOf(year, month, day);
      const past = !isEditable(iso);
      const inDraft = !past && draft?.set.has(iso);
      const off = inDraft ? draft!.makeUnavailable : offSet.has(iso);
      cells.push(
        <div key={`c-${row}-${month}`} className="flex h-[var(--awc-row)] items-center justify-center">
          <button
            type="button"
            data-iso={past ? undefined : iso}
            disabled={past}
            onPointerDown={(event) => {
              if (event.pointerType === "mouse" && event.button !== 0) return;
              startDrag(iso, event.pointerType === "touch");
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
        {monthLabels.map((label, month) => (
          <div
            key={month}
            className="truncate px-0.5 text-center text-[10px] font-semibold tracking-wide text-primary uppercase sm:text-[11px] md:text-sm"
          >
            {label}
          </div>
        ))}
      </div>

      <div className={cn("grid auto-rows-[var(--awc-row)]", COLS)}>{cells}</div>
    </div>
  );
}
