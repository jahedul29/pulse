"use client";

import { useSyncExternalStore } from "react";
import { HoverReadout } from "./hover-readout";

export interface HoverStore {
  set: (code: string | null) => void;
  get: () => string | null;
  subscribe: (listener: () => void) => () => void;
}

export function createHoverStore(): HoverStore {
  let code: string | null = null;
  const listeners = new Set<() => void>();
  return {
    set(next) {
      if (next === code) return;
      code = next;
      for (const listener of listeners) listener();
    },
    get: () => code,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function HoverSlot({
  store,
  inRegion,
  alsoIn,
}: {
  store: HoverStore;
  inRegion: (code: string) => boolean;
  alsoIn: (code: string) => string[];
}) {
  const code = useSyncExternalStore(store.subscribe, store.get, store.get);
  return code ? <HoverReadout code={code} inRegion={inRegion(code)} alsoIn={alsoIn(code)} /> : null;
}
