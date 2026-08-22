"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";

type ItemApi = { hide: () => void; hiding: boolean };

const LEAVE_MS = 260;
const ENTER_MS = 360;

export function HidableGrid<T>({
  items,
  getKey,
  renderItem,
  className,
  restoreLabel,
  allHiddenLabel = "All cards hidden",
}: {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T, api: ItemApi) => ReactNode;
  className?: string;
  restoreLabel: (count: number) => string;
  allHiddenLabel?: string;
}) {
  const [hidden, setHidden] = useState<string[]>([]);
  const [leaving, setLeaving] = useState<string[]>([]);
  const [entering, setEntering] = useState<string[]>([]);
  const gridRef = useRef<HTMLDivElement>(null);
  const prevRects = useRef<Map<string, DOMRect>>(new Map());
  const prevKeys = useRef<string | null>(null);

  useLayoutEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const nodes = Array.from(el.querySelectorAll<HTMLElement>("[data-flip]"));
    const keys = nodes.map((n) => n.dataset.flip).join(",");
    const lastRects = new Map<string, DOMRect>();
    nodes.forEach((n) => {
      if (n.dataset.flip) lastRects.set(n.dataset.flip, n.getBoundingClientRect());
    });

    const setChanged = prevKeys.current !== null && keys !== prevKeys.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (setChanged && !reduce) {
      nodes.forEach((n) => {
        const id = n.dataset.flip;
        if (!id) return;
        const first = prevRects.current.get(id);
        const last = lastRects.get(id);
        if (!first || !last) return;
        const dx = first.left - last.left;
        const dy = first.top - last.top;
        if (dx || dy) {
          n.animate(
            [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }],
            { duration: 320, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
          );
        }
      });
    }

    prevRects.current = lastRects;
    prevKeys.current = keys;
  });

  const hide = useCallback((key: string) => {
    setLeaving((l) => (l.includes(key) ? l : [...l, key]));
  }, []);

  const restoreAll = useCallback(() => {
    setEntering(hidden);
    setHidden([]);
  }, [hidden]);

  useEffect(() => {
    if (leaving.length === 0) return;
    const id = window.setTimeout(() => {
      setHidden((h) => [...h, ...leaving]);
      setLeaving([]);
    }, LEAVE_MS);
    return () => clearTimeout(id);
  }, [leaving]);

  useEffect(() => {
    if (entering.length === 0) return;
    const id = window.setTimeout(() => setEntering([]), ENTER_MS);
    return () => clearTimeout(id);
  }, [entering]);

  const visible = items.filter((it) => !hidden.includes(getKey(it)));

  return (
    <>
      <div ref={gridRef} className={className}>
        {visible.map((it) => {
          const key = getKey(it);
          const hiding = leaving.includes(key);
          const isEntering = entering.includes(key);
          return (
            <div
              key={key}
              data-flip={key}
              className={cn(
                "transition-[opacity,transform,filter] duration-[260ms] motion-reduce:transition-none",
                hiding && "pointer-events-none scale-90 opacity-0 blur-[2px]",
                isEntering &&
                  "animate-[kpi-card-in_0.34s_cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:animate-none",
              )}
            >
              {renderItem(it, { hide: () => hide(key), hiding })}
            </div>
          );
        })}
        {visible.length === 0 && hidden.length > 0 && (
          <div className="col-span-full grid place-items-center rounded-xl border border-dashed border-border py-10 text-sm text-muted-foreground">
            {allHiddenLabel}
          </div>
        )}
      </div>
      {hidden.length > 0 && (
        <button
          type="button"
          onClick={restoreAll}
          className="mt-3 inline-flex items-center gap-1.5 self-start rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Eye className="size-3.5" /> {restoreLabel(hidden.length)}
        </button>
      )}
    </>
  );
}
