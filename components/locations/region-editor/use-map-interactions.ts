"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import type { LngLat } from "@/lib/mgrs/grid";
import { safeCellCodeAt } from "@/lib/mgrs/mgrs";
import { cellsInShape, type ShapeRule } from "@/lib/region-builder/cells-in-shape";
import { resolveMode, strokeAdds, type Modifiers, type SelectionMode } from "@/lib/region-builder/modes";
import type { CellChange, Selection, Stroke } from "@/lib/region-builder/selection";
import { closeRing, ellipseRing, rectangleRing } from "@/lib/region-builder/shapes";
import { isShapeTool, toolForKeyCode, type EditorTool } from "@/lib/region-builder/tools";
import type { RegionMapController } from "./map/load-region-map";

export const PAINT_MIN_ZOOM = 9;
const TAP_TOLERANCE_PX = 6;
const TAP_MAX_MS = 500;
const SHAPE_MIN_PX = 4;
const VERTEX_HIT_PX = 10;
const STROKE_SAMPLE_PX = 4;

export type InteractionNotice = "paintZoom" | "tooLarge" | "noCells" | "shapeCancelled" | "needThreeCorners" | null;

type Gesture =
  | { kind: "idle" }
  | { kind: "stroke"; pointerId: number; stroke: Stroke; lastX: number; lastY: number }
  | { kind: "tap"; pointerId: number; startX: number; startY: number; startedAt: number }
  | { kind: "shape"; pointerId: number; shape: "rectangle" | "ellipse"; start: LngLat; startX: number; startY: number; endX: number; endY: number; end: LngLat };

interface InteractionOptions {
  controller: RegionMapController | null;
  scopeRef: RefObject<HTMLElement | null>;
  selection: Selection;
  tool: EditorTool;
  mode: SelectionMode;
  rule: ShapeRule;
  canEdit: boolean;
  enabled: boolean;
  onToolChange: (tool: EditorTool) => void;
  onHover: (code: string | null) => void;
  onChange: (change: CellChange) => void;
  onPolygonCorners: (corners: number) => void;
  onNotice: (notice: InteractionNotice) => void;
  onBusy: (busy: boolean) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onFit: () => void;
  onZoom: (delta: number) => void;
}

function modifiersOf(event: { shiftKey: boolean; altKey: boolean }): Modifiers {
  return { shift: event.shiftKey, alt: event.altKey };
}

function isShortcutTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return true;
  if (target.isContentEditable) return false;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return false;
  return !target.closest("[role=dialog],[role=alertdialog],[role=listbox],[role=menu]");
}

const INTERACTIVE_SELECTOR = "button,a[href],summary,[role=button],[role=tab],[role=switch],[role=checkbox],[role=option],[role=menuitem]";

function isInteractive(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(INTERACTIVE_SELECTOR));
}

function inScope(target: EventTarget | null, scope: HTMLElement | null): boolean {
  if (!(target instanceof Node) || target === document.body || target === document.documentElement) return true;
  return Boolean(scope?.contains(target));
}

function nextFrames(count: number): Promise<void> {
  return new Promise((resolve) => {
    const step = (remaining: number) => {
      if (remaining <= 0) resolve();
      else requestAnimationFrame(() => step(remaining - 1));
    };
    step(count);
  });
}

export function useMapInteractions(options: InteractionOptions) {
  const optionsRef = useRef(options);
  const gestureRef = useRef<Gesture>({ kind: "idle" });
  const polygonRef = useRef<LngLat[]>([]);
  const polygonCursorRef = useRef<LngLat | null>(null);
  const spaceHeldRef = useRef(false);
  const hoverFrameRef = useRef(0);
  const lastHoverRef = useRef<string | null>(null);

  useEffect(() => {
    optionsRef.current = options;
  });

  const { controller, tool, canEdit, enabled } = options;

  const applyInteraction = useCallback(() => {
    const current = optionsRef.current;
    const mapController = current.controller;
    if (!mapController) return;
    const space = spaceHeldRef.current;
    const editing = current.canEdit && current.enabled;
    const panTool = current.tool === "pan" || !editing;
    mapController.setInteraction({
      dragPan: space || panTool || current.tool === "polygon",
      doubleClickZoom: panTool,
    });
    mapController.setCursor(space || panTool ? "grab" : "crosshair");
  }, []);

  useEffect(() => {
    applyInteraction();
  }, [applyInteraction, controller, tool, canEdit, enabled]);

  const setDraftFromPolygon = useCallback(() => {
    const current = optionsRef.current;
    const vertices = polygonRef.current;
    const cursor = polygonCursorRef.current;
    if (!vertices.length) {
      current.controller?.setDraft(null);
      return;
    }
    const line = cursor ? [...vertices, cursor] : [...vertices];
    current.controller?.setDraft({
      ring: line.length >= 3 ? closeRing(line) : null,
      line,
      removing: current.mode === "remove",
    });
  }, []);

  const clearPolygon = useCallback(() => {
    polygonRef.current = [];
    polygonCursorRef.current = null;
    optionsRef.current.controller?.setDraft(null);
    optionsRef.current.onPolygonCorners(0);
  }, []);

  const commitShape = useCallback(async (ring: LngLat[], mode: SelectionMode) => {
    const current = optionsRef.current;
    current.controller?.setDraft(null);
    current.onBusy(true);
    await nextFrames(2);
    const latest = optionsRef.current;
    if (!latest.canEdit || !latest.enabled) {
      latest.onBusy(false);
      return;
    }
    const result = cellsInShape(ring, current.rule);
    current.onBusy(false);
    if (result.kind === "tooLarge") {
      current.onNotice("tooLarge");
      return;
    }
    if (result.kind === "empty") {
      current.onNotice("noCells");
      return;
    }
    const change = current.selection.applyCodes(result.codes, mode);
    current.controller?.applyChange(change);
    current.onChange(change);
  }, []);

  const finishPolygon = useCallback(
    (modifiers: Modifiers = { shift: false, alt: false }) => {
      if (!optionsRef.current.canEdit || !optionsRef.current.enabled) return;
      const vertices = polygonRef.current;
      if (vertices.length < 3) {
        optionsRef.current.onNotice("needThreeCorners");
        return;
      }
      const ring = closeRing(vertices);
      const mode = resolveMode(optionsRef.current.mode, modifiers);
      clearPolygon();
      void commitShape(ring, mode);
    },
    [clearPolygon, commitShape],
  );

  const undoPolygonPoint = useCallback(() => {
    polygonRef.current = polygonRef.current.slice(0, -1);
    optionsRef.current.onPolygonCorners(polygonRef.current.length);
    setDraftFromPolygon();
  }, [setDraftFromPolygon]);

  const endStroke = useCallback(() => {
    const gesture = gestureRef.current;
    if (gesture.kind !== "stroke") return;
    gestureRef.current = { kind: "idle" };
    const change = gesture.stroke.end();
    optionsRef.current.onChange(change);
  }, []);

  const cancelShapeDrag = useCallback(() => {
    if (gestureRef.current.kind !== "shape") return false;
    gestureRef.current = { kind: "idle" };
    optionsRef.current.controller?.setDraft(null);
    return true;
  }, []);

  const cancelShape = useCallback(() => {
    const cancelledDrag = cancelShapeDrag();
    const hadPolygon = polygonRef.current.length > 0;
    if (hadPolygon) clearPolygon();
    if (cancelledDrag || hadPolygon) optionsRef.current.onNotice("shapeCancelled");
    return cancelledDrag || hadPolygon;
  }, [cancelShapeDrag, clearPolygon]);

  useEffect(() => {
    if (tool !== "polygon") clearPolygon();
    cancelShapeDrag();
    endStroke();
  }, [tool, clearPolygon, cancelShapeDrag, endStroke]);

  useEffect(() => {
    if (!controller) return;
    const canvas = controller.canvas;

    const localPoint = (event: PointerEvent | MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
      const y = Math.min(Math.max(event.clientY - rect.top, 0), rect.height);
      return { x, y };
    };
    const codeAt = (x: number, y: number) => {
      const [longitude, latitude] = controller.unproject(x, y);
      return safeCellCodeAt(latitude, longitude);
    };
    const paint = (stroke: Stroke, code: string | null) => {
      if (!code) return;
      const change = stroke.paint(code);
      if (change) controller.applyChange(change);
    };
    const editingTool = () => {
      const current = optionsRef.current;
      return current.canEdit && current.enabled && !spaceHeldRef.current ? current.tool : "pan";
    };

    const onPointerDownCapture = (event: PointerEvent) => {
      if (editingTool() !== "click") return;
      controller.setInteraction({ dragPan: event.pointerType === "touch", doubleClickZoom: false });
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || !event.isPrimary) {
        if (!event.isPrimary) {
          cancelShapeDrag();
          endStroke();
        }
        return;
      }
      const activeTool = editingTool();
      if (activeTool === "pan") return;
      const { x, y } = localPoint(event);
      const current = optionsRef.current;

      if (activeTool === "click") {
        if (event.pointerType === "touch") {
          gestureRef.current = { kind: "tap", pointerId: event.pointerId, startX: x, startY: y, startedAt: performance.now() };
          return;
        }
        if (controller.zoom() < PAINT_MIN_ZOOM) {
          current.onNotice("paintZoom");
          return;
        }
        const code = codeAt(x, y);
        const stroke = current.selection.beginStroke(
          strokeAdds(code ? current.selection.has(code) : null, current.mode, modifiersOf(event)),
        );
        canvas.setPointerCapture?.(event.pointerId);
        gestureRef.current = { kind: "stroke", pointerId: event.pointerId, stroke, lastX: x, lastY: y };
        paint(stroke, code);
        return;
      }

      if (isShapeTool(activeTool)) {
        const start = controller.unproject(x, y);
        canvas.setPointerCapture?.(event.pointerId);
        gestureRef.current = { kind: "shape", pointerId: event.pointerId, shape: activeTool, start, startX: x, startY: y, endX: x, endY: y, end: start };
        return;
      }

      if (activeTool === "polygon") {
        gestureRef.current = { kind: "tap", pointerId: event.pointerId, startX: x, startY: y, startedAt: performance.now() };
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      const gesture = gestureRef.current;
      const { x, y } = localPoint(event);
      const current = optionsRef.current;

      if (gesture.kind === "stroke" && event.pointerId === gesture.pointerId) {
        const distance = Math.hypot(x - gesture.lastX, y - gesture.lastY);
        const steps = Math.max(1, Math.ceil(distance / STROKE_SAMPLE_PX));
        for (let step = 1; step <= steps; step++) {
          const fraction = step / steps;
          paint(gesture.stroke, codeAt(gesture.lastX + (x - gesture.lastX) * fraction, gesture.lastY + (y - gesture.lastY) * fraction));
        }
        gesture.lastX = x;
        gesture.lastY = y;
        return;
      }

      if (gesture.kind === "shape" && event.pointerId === gesture.pointerId) {
        gesture.end = controller.unproject(x, y);
        gesture.endX = x;
        gesture.endY = y;
        const ring = gesture.shape === "rectangle" ? rectangleRing(gesture.start, gesture.end) : ellipseRing(gesture.start, gesture.end);
        controller.setDraft({ ring, line: null, removing: resolveMode(current.mode, modifiersOf(event)) === "remove" });
        return;
      }

      if (current.tool === "polygon" && polygonRef.current.length) {
        polygonCursorRef.current = controller.unproject(x, y);
        setDraftFromPolygon();
      }

      if (event.buttons !== 0 && event.pointerType !== "mouse") return;
      if (hoverFrameRef.current) return;
      hoverFrameRef.current = requestAnimationFrame(() => {
        hoverFrameRef.current = 0;
        const code = codeAt(x, y);
        if (code === lastHoverRef.current) return;
        lastHoverRef.current = code;
        controller.setHoverCell(code);
        optionsRef.current.onHover(code);
      });
    };

    const onPointerUp = (event: PointerEvent) => {
      const gesture = gestureRef.current;
      const current = optionsRef.current;
      if (gesture.kind === "stroke" && event.pointerId === gesture.pointerId) {
        endStroke();
        return;
      }
      if (gesture.kind === "shape" && event.pointerId === gesture.pointerId) {
        gestureRef.current = { kind: "idle" };
        const tiny = Math.abs(gesture.endX - gesture.startX) < SHAPE_MIN_PX || Math.abs(gesture.endY - gesture.startY) < SHAPE_MIN_PX;
        if (tiny) {
          controller.setDraft(null);
          return;
        }
        const ring = gesture.shape === "rectangle" ? rectangleRing(gesture.start, gesture.end) : ellipseRing(gesture.start, gesture.end);
        void commitShape(ring, resolveMode(current.mode, modifiersOf(event)));
        return;
      }
      if (gesture.kind === "tap" && event.pointerId === gesture.pointerId) {
        gestureRef.current = { kind: "idle" };
        const { x, y } = localPoint(event);
        const moved = Math.hypot(x - gesture.startX, y - gesture.startY) > TAP_TOLERANCE_PX;
        if (moved) return;
        if (current.tool === "click") {
          if (performance.now() - gesture.startedAt > TAP_MAX_MS) return;
          if (controller.zoom() < PAINT_MIN_ZOOM) {
            current.onNotice("paintZoom");
            return;
          }
          const code = codeAt(x, y);
          if (!code) return;
          const change = current.selection.toggle(code);
          controller.applyChange(change);
          current.onChange(change);
          return;
        }
        if (current.tool === "polygon") {
          const vertices = polygonRef.current;
          const near = (vertex: LngLat | undefined) => {
            if (!vertex) return false;
            const point = controller.project(vertex);
            return Math.hypot(point.x - x, point.y - y) <= VERTEX_HIT_PX;
          };
          if (near(vertices[vertices.length - 1])) return;
          if (vertices.length >= 3 && near(vertices[0])) {
            finishPolygon(modifiersOf(event));
            return;
          }
          polygonRef.current = [...vertices, controller.unproject(x, y)];
          current.onPolygonCorners(polygonRef.current.length);
          setDraftFromPolygon();
        }
      }
    };

    const onPointerCancel = () => {
      endStroke();
      cancelShapeDrag();
      if (gestureRef.current.kind === "tap") gestureRef.current = { kind: "idle" };
    };

    const onDoubleClick = (event: MouseEvent) => {
      if (editingTool() !== "polygon") return;
      event.preventDefault();
      finishPolygon(modifiersOf(event));
    };

    const onPointerLeave = () => {
      if (lastHoverRef.current === null) return;
      lastHoverRef.current = null;
      controller.setHoverCell(null);
      optionsRef.current.onHover(null);
    };

    canvas.addEventListener("pointerdown", onPointerDownCapture, { capture: true });
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerCancel);
    canvas.addEventListener("lostpointercapture", onPointerCancel);
    canvas.addEventListener("pointerleave", onPointerLeave);
    canvas.addEventListener("dblclick", onDoubleClick);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      if (hoverFrameRef.current) cancelAnimationFrame(hoverFrameRef.current);
      hoverFrameRef.current = 0;
      canvas.removeEventListener("pointerdown", onPointerDownCapture, { capture: true });
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerCancel);
      canvas.removeEventListener("lostpointercapture", onPointerCancel);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("dblclick", onDoubleClick);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [controller, cancelShapeDrag, commitShape, endStroke, finishPolygon, setDraftFromPolygon]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isShortcutTarget(event.target)) return;
      const current = optionsRef.current;
      const command = event.metaKey || event.ctrlKey;
      const scoped = inScope(event.target, current.scopeRef.current);
      const interactive = isInteractive(event.target);
      const editing = current.canEdit && current.enabled;

      if (event.code === "Space") {
        if (interactive || !scoped) return;
        event.preventDefault();
        if (event.repeat || spaceHeldRef.current) return;
        spaceHeldRef.current = true;
        endStroke();
        cancelShapeDrag();
        applyInteraction();
        return;
      }
      if (event.key === "Escape") {
        if (!cancelShape() && current.tool !== "pan") current.onToolChange("pan");
        return;
      }
      if (event.key === "Enter" && !interactive && editing && current.tool === "polygon" && polygonRef.current.length) {
        event.preventDefault();
        finishPolygon(modifiersOf(event));
        return;
      }
      if (event.key === "Backspace" && !interactive && editing && current.tool === "polygon" && polygonRef.current.length) {
        event.preventDefault();
        undoPolygonPoint();
        return;
      }
      if (command && event.code === "KeyZ") {
        event.preventDefault();
        if (!editing) return;
        if (event.shiftKey) current.onRedo();
        else current.onUndo();
        return;
      }
      if (command && event.code === "KeyY") {
        event.preventDefault();
        if (editing) current.onRedo();
        return;
      }
      if (command && event.code === "KeyS") {
        event.preventDefault();
        current.onSave();
        return;
      }
      if (command || event.altKey || !scoped) return;
      if (event.key === "+" || event.key === "=" || event.key === "-") {
        const canvasContainer = current.controller?.canvas.parentElement;
        if (canvasContainer && event.target instanceof Node && canvasContainer.contains(event.target)) return;
        current.onZoom(event.key === "-" ? -1 : 1);
        return;
      }
      if (event.code === "KeyF") {
        current.onFit();
        return;
      }
      const nextTool = toolForKeyCode(event.code);
      if (nextTool && (nextTool === "pan" || editing)) current.onToolChange(nextTool);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space" || !spaceHeldRef.current) return;
      spaceHeldRef.current = false;
      applyInteraction();
    };
    const onBlur = () => {
      endStroke();
      cancelShapeDrag();
      if (!spaceHeldRef.current) return;
      spaceHeldRef.current = false;
      applyInteraction();
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [applyInteraction, cancelShape, cancelShapeDrag, endStroke, finishPolygon, undoPolygonPoint]);

  return {
    finishPolygon: () => finishPolygon(),
    undoPolygonPoint,
    cancelShape,
  };
}
