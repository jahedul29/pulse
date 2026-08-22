import { useEffect, type RefObject } from "react";

const THRESHOLD = 6;

export function useDragScroll(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let active = false;
    let panning = false;
    let startX = 0;
    let startLeft = 0;
    let pointerId = 0;

    const canPan = () => el.scrollWidth - el.clientWidth > 1;

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0 || !canPan()) return;
      active = true;
      panning = false;
      startX = e.clientX;
      startLeft = el.scrollLeft;
      pointerId = e.pointerId;
    };

    const onMove = (e: PointerEvent) => {
      if (!active) return;
      const dx = e.clientX - startX;
      if (!panning) {
        if (Math.abs(dx) < THRESHOLD) return;
        panning = true;
        el.style.userSelect = "none";
        el.style.setProperty("-webkit-user-select", "none");
        el.classList.add("dt-panning");
        try {
          el.setPointerCapture(pointerId);
        } catch {
          void 0;
        }
      }
      el.scrollLeft = startLeft - dx;
      e.preventDefault();
    };

    const onUp = () => {
      if (!active) return;
      const wasPanning = panning;
      active = false;
      panning = false;
      el.style.userSelect = "";
      el.style.removeProperty("-webkit-user-select");
      el.classList.remove("dt-panning");
      try {
        el.releasePointerCapture(pointerId);
      } catch {
        void 0;
      }
      if (wasPanning) {
        const swallow = (ev: MouseEvent) => {
          ev.stopPropagation();
          ev.preventDefault();
        };
        el.addEventListener("click", swallow, { capture: true, once: true });
        window.setTimeout(() => el.removeEventListener("click", swallow, true), 0);
      }
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, [ref]);
}
