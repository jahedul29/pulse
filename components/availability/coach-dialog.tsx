"use client";

import { Fragment, useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { slotToTime } from "@/lib/availability/constants";
import { weekdayShortLabels } from "@/lib/i18n/calendar";
import { cn } from "@/lib/utils";
import type { SpecialistType } from "@/lib/availability/types";

type Status = "available" | "unavailable" | "online";

const DAYS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
const VISIBLE_SLOTS = 12;
const OFF_DAYS = [4, 6];
const SAMPLE_A = "6-1";
const SAMPLE_B = ["0-3", "1-3", "2-3"];
const GRID_COLS = "grid-cols-[58px_repeat(7,minmax(0,1fr))]";

export function CoachDialog({
  open,
  onOpenChange,
  role,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: SpecialistType;
}) {
  const t = useTranslations("coach");
  const weekdays = weekdayShortLabels(useLocale());
  const supportsOnline = role === "analyst";
  const stageRef = useRef<HTMLDivElement>(null);
  const dayRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const cellRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const rippleRef = useRef<HTMLSpanElement>(null);
  const timers = useRef<number[]>([]);
  const center = useRef<{ x: number; y: number; s: number } | null>(null);
  const tap = useRef(0);

  const [offDays, setOffDays] = useState<number[]>([]);
  const [cells, setCells] = useState<Record<string, Status>>({});
  const [hole, setHole] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [ripple, setRipple] = useState<{ x: number; y: number; s: number; key: number } | null>(null);
  const [playing, setPlaying] = useState(false);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  const after = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const spotEl = (el: HTMLElement | null) => {
    if (!el || !stageRef.current) return;
    const x = el.offsetLeft;
    const y = el.offsetTop;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    setHole({ x: x - 3, y: y - 3, w: w + 6, h: h + 6 });
    center.current = { x: x + w / 2, y: y + h / 2, s: Math.max(w, h) + 8 };
  };

  const spotRange = (k1: string, k2: string) => {
    const e1 = cellRefs.current[k1];
    const e2 = cellRefs.current[k2];
    if (!e1 || !e2 || !stageRef.current) return;
    const x = e1.offsetLeft;
    const w = e1.offsetWidth;
    const y1 = e1.offsetTop;
    const y2 = e2.offsetTop + e2.offsetHeight;
    setHole({ x: x - 3, y: y1 - 3, w: w + 6, h: y2 - y1 + 6 });
    center.current = { x: x + w / 2, y: (y1 + y2) / 2, s: Math.max(w, y2 - y1) + 8 };
  };

  const doPulse = () => {
    tap.current += 1;
    if (center.current) setRipple({ ...center.current, key: tap.current });
  };

  const nextStatus = useCallback(
    (s: Status): Status =>
      s === "available"
        ? "unavailable"
        : s === "unavailable"
          ? supportsOnline
            ? "online"
            : "available"
          : "available",
    [supportsOnline],
  );

  const cycleCell = useCallback(
    (key: string) => {
      setCells((prev) => ({ ...prev, [key]: nextStatus(prev[key] ?? "available") }));
    },
    [nextStatus],
  );

  const run = useCallback(() => {
    clearTimers();
    setPlaying(true);
    setOffDays([]);
    setCells({});
    setHole(null);
    setRipple(null);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const gap = reduce ? 320 : 850;
    const clickGap = reduce ? 380 : 900;
    const paintGap = reduce ? 90 : 180;

    let t = 300;

    OFF_DAYS.forEach((d) => {
      after(t, () => spotEl(dayRefs.current[d]));
      after(t + 120, doPulse);
      after(t + 260, () => setOffDays((prev) => [...prev, d]));
      t += gap;
    });

    t += 160;

    const clicksA = supportsOnline ? 3 : 2;
    for (let k = 0; k < clicksA; k++) {
      after(t, () => spotEl(cellRefs.current[SAMPLE_A]));
      after(t + 120, doPulse);
      after(t + 240, () => cycleCell(SAMPLE_A));
      t += clickGap;
    }

    t += 220;

    const passesB = supportsOnline ? 2 : 1;
    for (let pass = 0; pass < passesB; pass++) {
      after(t, () => spotRange(SAMPLE_B[0], SAMPLE_B[SAMPLE_B.length - 1]));
      after(t + 160, doPulse);
      SAMPLE_B.forEach((key, i) => after(t + 240 + i * paintGap, () => cycleCell(key)));
      t += 320 + SAMPLE_B.length * paintGap + 340;
    }

    after(t + 320, () => {
      setOffDays([]);
      setCells({});
      setHole(null);
      setRipple(null);
      setPlaying(false);
    });
  }, [supportsOnline, cycleCell]);

  useEffect(() => {
    if (!open) {
      clearTimers();
      setPlaying(false);
      return;
    }
    setPlaying(true);
    const id = window.setTimeout(run, 300);
    return () => {
      clearTimeout(id);
      clearTimers();
    };
  }, [open, run]);

  useEffect(() => {
    if (!ripple || !rippleRef.current) return;
    const anim = rippleRef.current.animate(
      [
        { transform: "translate(-50%, -50%) scale(0.45)", opacity: 0.7 },
        { transform: "translate(-50%, -50%) scale(1.9)", opacity: 0 },
      ],
      { duration: 620, easing: "cubic-bezier(0, 0.55, 0.45, 1)", fill: "forwards" },
    );
    return () => anim.cancel();
  }, [ripple]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        initialFocus={stageRef}
        className="font-manrope w-[calc(100vw-2rem)] max-w-[var(--modal-w)] sm:w-[var(--modal-w)]"
      >
        <DialogTitle className="sr-only">{t("title")}</DialogTitle>

        <div ref={stageRef} tabIndex={-1} className="relative p-4 pt-5 outline-none" style={{ "--cslot": "16px" } as CSSProperties}>
          <div
            className={cn(
              "grid gap-0.5 overflow-hidden rounded-full bg-card shadow-md ring-1 ring-foreground/5",
              GRID_COLS,
            )}
          >
            <div />
            {DAYS.map((d, i) => (
              <button
                key={d}
                ref={(el) => {
                  dayRefs.current[i] = el;
                }}
                type="button"
                tabIndex={-1}
                className={cn(
                  "py-1 text-center text-[9px] font-semibold uppercase tracking-wide transition-colors",
                  offDays.includes(i) ? "bg-danger text-danger-foreground" : "text-primary",
                )}
              >
                {weekdays[i]}
              </button>
            ))}
          </div>

          <div className={cn("mt-1 grid", GRID_COLS)}>
            {Array.from({ length: VISIBLE_SLOTS }, (_, r) => (
              <Fragment key={r}>
                <div
                  className="tabular flex items-center justify-end whitespace-nowrap pe-1.5 text-[8px] leading-none text-primary"
                  style={{ height: "var(--cslot)" }}
                >
                  {slotToTime(r)} - {slotToTime(r + 1)}
                </div>
                {DAYS.map((_, c) => {
                  const key = `${r}-${c}`;
                  const status: Status = offDays.includes(c)
                    ? "unavailable"
                    : (cells[key] ?? "available");
                  return (
                    <div key={c} className="px-0.5 py-px" style={{ height: "var(--cslot)" }}>
                      <div
                        ref={(el) => {
                          cellRefs.current[key] = el;
                        }}
                        className={cn(
                          "flex h-full items-center justify-center rounded-[8px] transition-colors duration-150",
                          status === "unavailable" ? "bg-danger" : "bg-muted",
                        )}
                      >
                        {status === "online" && (
                          <span className="size-2 rounded-full bg-chart-3 shadow-sm" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>

          {hole && (
            <div
              className="pointer-events-none absolute rounded-[8px] transition-all duration-300"
              style={{
                left: hole.x,
                top: hole.y,
                width: hole.w,
                height: hole.h,
                boxShadow: "0 0 0 9999px rgba(20,8,40,.55)",
                outline: "2px dashed rgba(255,255,255,.9)",
                outlineOffset: "2px",
              }}
            />
          )}

          {ripple && (
            <span
              key={`ripple-${ripple.key}`}
              ref={rippleRef}
              aria-hidden
              className="pointer-events-none absolute z-20 rounded-full border-[3px] border-primary bg-primary/10"
              style={{
                left: ripple.x,
                top: ripple.y,
                width: ripple.s,
                height: ripple.s,
                transform: "translate(-50%, -50%)",
                opacity: 0,
              }}
            />
          )}
        </div>

        <div className="relative z-10 flex items-center justify-center gap-2.5 rounded-b-xl border-t bg-[color-mix(in_oklab,var(--muted)_50%,var(--popover))] p-4">
          <Button
            variant="secondary"
            size="lg"
            disabled={playing}
            className="h-9 rounded-full sm:h-10 flex-1"
            onClick={run}
          >
            {t("replay")}
          </Button>
          <Button
            size="lg"
            className="h-9 rounded-full bg-primary font-semibold text-primary-foreground hover:bg-primary/90 sm:h-10 flex-1"
            onClick={() => onOpenChange(false)}
          >
            {t("gotIt")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
