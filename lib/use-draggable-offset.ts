"use client";

import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

export type DragOffset = { x: number; y: number };

type Bounds = { minX: number; maxX: number; minY: number; maxY: number };
type Drag = { pointerId: number; startX: number; startY: number; origin: DragOffset; bounds: Bounds; moved: boolean };

const DRAG_THRESHOLD = 5;
const VIEWPORT_MARGIN = 8;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function boundsFor(element: HTMLElement, offset: DragOffset): Bounds {
  const rect = element.getBoundingClientRect();
  const left = rect.left - offset.x;
  const top = rect.top - offset.y;
  return {
    minX: VIEWPORT_MARGIN - left,
    maxX: window.innerWidth - VIEWPORT_MARGIN - (left + rect.width),
    minY: VIEWPORT_MARGIN - top,
    maxY: window.innerHeight - VIEWPORT_MARGIN - (top + rect.height),
  };
}

function within(offset: DragOffset, bounds: Bounds): DragOffset {
  return { x: clamp(offset.x, bounds.minX, bounds.maxX), y: clamp(offset.y, bounds.minY, bounds.maxY) };
}

export function useDraggableOffset(
  ref: RefObject<HTMLElement | null>,
  offset: DragOffset,
  onMove: (next: DragOffset) => void,
) {
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const keepInView = () => {
      const element = ref.current;
      if (!element) return;
      const next = within(offset, boundsFor(element, offset));
      if (next.x !== offset.x || next.y !== offset.y) onMove(next);
    };
    window.addEventListener("resize", keepInView);
    return () => window.removeEventListener("resize", keepInView);
  }, [ref, offset, onMove]);

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    suppressClick.current = false;
    if (event.button !== 0) return;
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: offset,
      bounds: boundsFor(event.currentTarget, offset),
      moved: false,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - current.startX;
    const deltaY = event.clientY - current.startY;
    if (!current.moved && Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD) return;
    if (!current.moved) {
      current.moved = true;
      setDragging(true);
    }
    onMove(within({ x: current.origin.x + deltaX, y: current.origin.y + deltaY }, current.bounds));
  };

  const finish = (event: ReactPointerEvent<HTMLElement>, completed: boolean) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    drag.current = null;
    if (!current.moved) return;
    suppressClick.current = completed;
    setDragging(false);
  };

  const onClickCapture = (event: ReactMouseEvent<HTMLElement>) => {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  return {
    dragging,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: (event: ReactPointerEvent<HTMLElement>) => finish(event, true),
      onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => finish(event, false),
      onClickCapture,
    },
  };
}
