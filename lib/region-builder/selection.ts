import type { LngLat } from "@/lib/mgrs/grid";
import { applyMode, type SelectionMode } from "./modes";

export type CentreSource = "saved" | "auto" | "manual";

export interface CellChange {
  added: string[];
  removed: string[];
}

export interface SelectionSnapshot {
  loaded: boolean;
  count: number;
  centre: LngLat | null;
  centreSource: CentreSource;
  addedCount: number;
  removedCount: number;
  centreChanged: boolean;
  dirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  revision: number;
}

export interface Stroke {
  paint(code: string): CellChange | null;
  end(): CellChange;
}

export const HISTORY_LIMIT = 100;
const CENTRE_TOLERANCE_DEGREES = 1e-7;

function sameCentre(first: LngLat | null, second: LngLat | null): boolean {
  if (!first || !second) return first === second;
  return Math.abs(first[0] - second[0]) < CENTRE_TOLERANCE_DEGREES && Math.abs(first[1] - second[1]) < CENTRE_TOLERANCE_DEGREES;
}

export function isEmptyChange(change: CellChange): boolean {
  return change.added.length === 0 && change.removed.length === 0;
}

function invert(change: CellChange): CellChange {
  return { added: change.removed, removed: change.added };
}

export function createSelection() {
  let picked = new Set<string>();
  let saved = new Set<string>();
  let addedCount = 0;
  let removedCount = 0;
  let undoStack: CellChange[] = [];
  let redoStack: CellChange[] = [];
  let revision = 0;
  let loaded = false;
  let centre: LngLat | null = null;
  let centreSource: CentreSource = "auto";
  let savedCentre: LngLat | null = null;
  let snapshot: SelectionSnapshot | null = null;
  const listeners = new Set<() => void>();

  const notify = () => {
    revision += 1;
    snapshot = null;
    for (const listener of listeners) listener();
  };

  const addCode = (code: string): boolean => {
    if (picked.has(code)) return false;
    picked.add(code);
    if (saved.has(code)) removedCount -= 1;
    else addedCount += 1;
    return true;
  };

  const removeCode = (code: string): boolean => {
    if (!picked.has(code)) return false;
    picked.delete(code);
    if (saved.has(code)) removedCount += 1;
    else addedCount -= 1;
    return true;
  };

  const applyChange = (change: CellChange): CellChange => {
    const applied: CellChange = { added: [], removed: [] };
    for (const code of change.removed) if (removeCode(code)) applied.removed.push(code);
    for (const code of change.added) if (addCode(code)) applied.added.push(code);
    return applied;
  };

  const record = (change: CellChange) => {
    if (isEmptyChange(change)) return;
    undoStack.push(change);
    if (undoStack.length > HISTORY_LIMIT) undoStack = undoStack.slice(-HISTORY_LIMIT);
    redoStack = [];
  };

  const commit = (change: CellChange): CellChange => {
    const applied = applyChange(change);
    record(applied);
    if (!isEmptyChange(applied)) notify();
    return applied;
  };

  return {
    load(codes: Iterable<string>, initialCentre: { point: LngLat | null; source: CentreSource } = { point: null, source: "auto" }) {
      loaded = true;
      centre = initialCentre.point;
      centreSource = initialCentre.source;
      savedCentre = initialCentre.point;
      picked = new Set(codes);
      saved = new Set(picked);
      addedCount = 0;
      removedCount = 0;
      undoStack = [];
      redoStack = [];
      notify();
    },
    has(code: string): boolean {
      return picked.has(code);
    },
    codes(): string[] {
      return [...picked];
    },
    beginStroke(adding: boolean): Stroke {
      const stroke: CellChange = { added: [], removed: [] };
      return {
        paint(code) {
          const changed = adding ? addCode(code) : removeCode(code);
          if (!changed) return null;
          if (adding) stroke.added.push(code);
          else stroke.removed.push(code);
          notify();
          return adding ? { added: [code], removed: [] } : { added: [], removed: [code] };
        },
        end() {
          record(stroke);
          notify();
          return stroke;
        },
      };
    },
    applyCodes(codes: Iterable<string>, mode: SelectionMode): CellChange {
      const change: CellChange = { added: [], removed: [] };
      for (const code of codes) {
        const wanted = applyMode(picked.has(code), mode);
        if (wanted && !picked.has(code)) change.added.push(code);
        if (!wanted && picked.has(code)) change.removed.push(code);
      }
      return commit(change);
    },
    toggle(code: string): CellChange {
      return commit(picked.has(code) ? { added: [], removed: [code] } : { added: [code], removed: [] });
    },
    dropAll(): CellChange {
      return commit({ added: [], removed: [...picked] });
    },
    revert(): CellChange {
      const change: CellChange = { added: [], removed: [] };
      for (const code of picked) if (!saved.has(code)) change.removed.push(code);
      for (const code of saved) if (!picked.has(code)) change.added.push(code);
      const centreChanged = !sameCentre(centre, savedCentre);
      centre = savedCentre;
      centreSource = savedCentre ? "saved" : "auto";
      const applied = commit(change);
      if (centreChanged && isEmptyChange(applied)) notify();
      return applied;
    },
    undo(): CellChange | null {
      const entry = undoStack.pop();
      if (!entry) return null;
      const applied = applyChange(invert(entry));
      redoStack.push(entry);
      notify();
      return applied;
    },
    redo(): CellChange | null {
      const entry = redoStack.pop();
      if (!entry) return null;
      const applied = applyChange(entry);
      undoStack.push(entry);
      notify();
      return applied;
    },
    setCentre(point: LngLat | null, source: CentreSource) {
      if (sameCentre(point, centre) && source === centreSource) return;
      centre = point;
      centreSource = source;
      notify();
    },
    markSaved(sentCodes: Iterable<string>, savedPoint: LngLat | null) {
      saved = new Set(sentCodes);
      addedCount = 0;
      removedCount = 0;
      for (const code of picked) if (!saved.has(code)) addedCount += 1;
      for (const code of saved) if (!picked.has(code)) removedCount += 1;
      if (sameCentre(centre, savedPoint)) {
        centre = savedPoint;
        centreSource = "saved";
      }
      savedCentre = savedPoint;
      notify();
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot(): SelectionSnapshot {
      if (!snapshot) {
        snapshot = {
          loaded,
          count: picked.size,
          centre,
          centreSource,
          addedCount,
          removedCount,
          centreChanged: !sameCentre(centre, savedCentre),
          dirty: addedCount + removedCount > 0 || !sameCentre(centre, savedCentre),
          canUndo: undoStack.length > 0,
          canRedo: redoStack.length > 0,
          revision,
        };
      }
      return snapshot;
    },
  };
}

export type Selection = ReturnType<typeof createSelection>;
