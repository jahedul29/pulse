"use client";

import { useEffect, useState } from "react";

export function useNow(intervalMs: number, enabled = true): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const tick = () => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs, enabled]);
  return now;
}
