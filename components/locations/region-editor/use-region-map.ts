"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { LngLat, RingLookup } from "@/lib/mgrs/grid";
import type { MapBackground } from "@/lib/region-builder/backgrounds";
import { loadRegionMap, type RegionMapController } from "./map/load-region-map";
import { readMapPalette } from "./map/palette";

export type MapStatus = "starting" | "ready" | "failed";

interface BackgroundState {
  requested: MapBackground;
  applied: MapBackground;
}

export function useRegionMap({
  hostRef,
  initialView,
  background,
  rings,
  labels,
}: {
  hostRef: RefObject<HTMLDivElement | null>;
  initialView: { center: LngLat; zoom: number };
  background: MapBackground;
  rings: RingLookup;
  labels: Record<string, string>;
}) {
  const [attempt, setAttempt] = useState(0);
  const [controller, setController] = useState<RegionMapController | null>(null);
  const [failedAttempt, setFailedAttempt] = useState<number | null>(null);
  const [backgroundState, setBackgroundState] = useState<BackgroundState | null>(null);
  const initialViewRef = useRef(initialView);
  const backgroundRef = useRef(background);
  const labelsRef = useRef(labels);

  useEffect(() => {
    backgroundRef.current = background;
    labelsRef.current = labels;
  }, [background, labels]);

  useEffect(() => {
    controller?.setLabels(labels);
  }, [controller, labels]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const abort = new AbortController();
    let created: RegionMapController | null = null;
    const startBackground = backgroundRef.current;
    loadRegionMap({
      container: host,
      view: initialViewRef.current,
      background: startBackground,
      palette: readMapPalette(host, startBackground),
      rings,
      labels: labelsRef.current,
      signal: abort.signal,
    })
      .then((mapController) => {
        if (abort.signal.aborted) {
          mapController.destroy();
          return;
        }
        created = mapController;
        setController(mapController);
        setBackgroundState({ requested: startBackground, applied: mapController.background() });
      })
      .catch(() => {
        if (!abort.signal.aborted) setFailedAttempt(attempt);
      });
    return () => {
      abort.abort();
      created?.destroy();
    };
  }, [attempt, hostRef, rings]);

  useEffect(() => {
    const host = hostRef.current;
    if (!controller || !host || !backgroundState || backgroundState.requested === background) return;
    let cancelled = false;
    controller
      .setBackground(background, readMapPalette(host, background))
      .then((applied) => {
        if (!cancelled && applied) setBackgroundState({ requested: background, applied });
      })
      .catch(() => {
        if (!cancelled) setBackgroundState({ requested: background, applied: controller.background() });
      });
    return () => {
      cancelled = true;
    };
  }, [background, backgroundState, controller, hostRef]);

  const retry = useCallback(() => {
    setController(null);
    setAttempt((value) => value + 1);
  }, []);

  const liveController = controller && failedAttempt !== attempt ? controller : null;
  const status: MapStatus = liveController ? "ready" : failedAttempt === attempt ? "failed" : "starting";
  return {
    controller: liveController,
    status,
    backgroundFellBack: Boolean(backgroundState && backgroundState.applied !== backgroundState.requested),
    retry,
  };
}
