import type { Feature, FeatureCollection, Geometry } from "geojson";
import {
  getVersion,
  Map as MapLibreMap,
  Marker,
  setWorkerUrl,
  type ErrorEvent,
  type GeoJSONSource,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { GeoBounds, LngLat, RingLookup } from "@/lib/mgrs/grid";
import { gridLines } from "@/lib/region-builder/grid-lines";
import type { CellChange } from "@/lib/region-builder/selection";
import type { MapBackground } from "@/lib/region-builder/backgrounds";
import { startAttributionCollapsed } from "./attribution";
import { addOverlay, GRID_MIN_ZOOM, SOURCES } from "./layers";
import type { MapPalette } from "./palette";
import { styleFor } from "./styles";

const WORKER_PATH = "/vendor/maplibre-gl-worker.mjs";
const START_TIMEOUT_MS = 20000;
const STYLE_TIMEOUT_MS = 10000;
const GRID_REFRESH_MS = 150;
const GRID_PADDING = 0.25;
const FULL_REPLACE_THRESHOLD = 20000;
const FIT_PADDING = 48;

export type MapCursor = "default" | "grab" | "crosshair";

export interface MapInsets {
  end?: number;
  bottom?: number;
}

export interface DraftShape {
  ring: LngLat[] | null;
  line: LngLat[] | null;
  removing: boolean;
}

export interface RegionMapOptions {
  container: HTMLElement;
  view: { center: LngLat; zoom: number };
  background: MapBackground;
  palette: MapPalette;
  rings: RingLookup;
  labels: Record<string, string>;
  signal?: AbortSignal;
}

export interface RegionMapController {
  readonly canvas: HTMLElement;
  unproject(x: number, y: number): LngLat;
  project(point: LngLat): { x: number; y: number };
  zoom(): number;
  setInteraction(input: { dragPan: boolean; doubleClickZoom: boolean }): void;
  setCursor(cursor: MapCursor): void;
  setPicked(codes: Iterable<string>): void;
  applyChange(change: CellChange): void;
  setOtherRegions(codes: Iterable<string>): void;
  setLayerVisibility(input: { grid?: boolean; others?: boolean }): void;
  setHoverCell(code: string | null): void;
  setDraft(draft: DraftShape | null): void;
  setCentre(point: LngLat | null, options: { draggable: boolean }): void;
  setBackground(background: MapBackground, palette: MapPalette): Promise<MapBackground | null>;
  setLabels(labels: Record<string, string>): void;
  background(): MapBackground;
  fitBounds(bounds: GeoBounds, insets?: MapInsets): void;
  zoomBy(delta: number): void;
  centre(): LngLat;
  onViewChange(listener: (zoom: number) => void): () => void;
  onCentreMoved(listener: (point: LngLat) => void): () => void;
  destroy(): void;
}

let workerConfigured = false;

function configureWorker() {
  if (workerConfigured) return;
  setWorkerUrl(`${WORKER_PATH}?v=${getVersion()}`);
  workerConfigured = true;
}

function collection(features: Feature[]): FeatureCollection {
  return { type: "FeatureCollection", features };
}

function cellFeature(code: string, ring: LngLat[]): Feature {
  return { type: "Feature", id: code, properties: {}, geometry: { type: "Polygon", coordinates: [ring] } };
}

function waitForStyle(map: MapLibreMap, timeoutMs: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const finish = (error?: Error) => {
      clearTimeout(timer);
      map.off("style.load", onLoad);
      map.off("error", onError);
      signal?.removeEventListener("abort", onAbort);
      if (error) reject(error);
      else resolve();
    };
    const onLoad = () => finish();
    const onError = (event: ErrorEvent) => {
      const detail = event as ErrorEvent & { sourceId?: string; tile?: unknown };
      if (detail.sourceId || detail.tile) return;
      finish(new Error(event.error?.message || "Map style failed to load"));
    };
    const onAbort = () => finish(abortError());
    const timer = setTimeout(() => finish(new Error("Map style did not load in time")), timeoutMs);
    map.on("style.load", onLoad);
    map.on("error", onError);
    signal?.addEventListener("abort", onAbort);
  });
}

function abortError(): Error {
  return new DOMException("Map start was cancelled", "AbortError");
}

function createCentreElement(): HTMLElement {
  const element = document.createElement("div");
  element.className =
    "size-5 rounded-full border-[3px] border-(--white) bg-primary shadow-md data-[draggable=true]:cursor-grab";
  element.setAttribute("aria-hidden", "true");
  return element;
}

export async function createRegionMap(options: RegionMapOptions): Promise<RegionMapController> {
  if (options.signal?.aborted) throw abortError();
  configureWorker();
  const { rings } = options;
  let palette = options.palette;
  const map = new MapLibreMap({
    container: options.container,
    style: styleFor(options.background, palette.blank),
    center: options.view.center,
    zoom: options.view.zoom,
    attributionControl: { compact: true },
    boxZoom: false,
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
    fadeDuration: 0,
    locale: options.labels,
  });
  map.touchZoomRotate.disableRotation();
  startAttributionCollapsed(map);

  let currentBackground = options.background;
  const stopping = new AbortController();
  const stopOnAbort = () => stopping.abort();
  options.signal?.addEventListener("abort", stopOnAbort);
  try {
    try {
      await waitForStyle(map, START_TIMEOUT_MS, stopping.signal);
    } catch (error) {
      if (stopping.signal.aborted) throw error;
      currentBackground = "none";
      map.setStyle(styleFor("none", palette.blank));
      await waitForStyle(map, START_TIMEOUT_MS, stopping.signal);
    }
  } catch (error) {
    map.remove();
    throw error;
  } finally {
    options.signal?.removeEventListener("abort", stopOnAbort);
  }

  const picked = new Map<string, Feature>();
  let otherFeatures: Feature[] = [];
  let gridData = collection([]);
  let hoverData = collection([]);
  let draftData = collection([]);
  let showGrid = true;
  let showOthers = true;
  let pendingAdded = new Set<string>();
  let pendingRemoved = new Set<string>();
  let flushHandle = 0;
  let styleGeneration = 0;
  let removed = false;
  let centreMarker: Marker | null = null;
  const viewListeners = new Set<(zoom: number) => void>();
  const centreListeners = new Set<(point: LngLat) => void>();

  const source = (id: string) => map.getSource<GeoJSONSource>(id);
  const currentData = (): Record<string, FeatureCollection> => ({
    [SOURCES.picked]: collection([...picked.values()]),
    [SOURCES.others]: collection(showOthers ? otherFeatures : []),
    [SOURCES.grid]: gridData,
    [SOURCES.hover]: hoverData,
    [SOURCES.draft]: draftData,
  });
  addOverlay(map, palette, currentData());

  const refreshGrid = () => {
    if (!showGrid || map.getZoom() < GRID_MIN_ZOOM) {
      gridData = collection([]);
    } else {
      const visible = map.getBounds();
      const width = visible.getEast() - visible.getWest();
      const height = visible.getNorth() - visible.getSouth();
      const grid = gridLines({
        west: visible.getWest() - width * GRID_PADDING,
        south: visible.getSouth() - height * GRID_PADDING,
        east: visible.getEast() + width * GRID_PADDING,
        north: visible.getNorth() + height * GRID_PADDING,
      });
      const features: Feature[] = [];
      for (const line of grid?.lines ?? []) {
        features.push({ type: "Feature", properties: { kind: "line" }, geometry: { type: "LineString", coordinates: line } });
      }
      for (const edge of grid?.zoneEdges ?? []) {
        features.push({ type: "Feature", properties: { kind: "edge" }, geometry: { type: "LineString", coordinates: edge } });
      }
      gridData = collection(features);
    }
    void source(SOURCES.grid)?.setData(gridData);
  };
  let gridTimer: ReturnType<typeof setTimeout> | undefined;
  const scheduleGrid = () => {
    clearTimeout(gridTimer);
    gridTimer = setTimeout(refreshGrid, GRID_REFRESH_MS);
  };
  const onMoveEnd = () => {
    scheduleGrid();
    for (const listener of viewListeners) listener(map.getZoom());
  };
  map.on("moveend", onMoveEnd);
  refreshGrid();

  const flush = () => {
    flushHandle = 0;
    const pickedSource = source(SOURCES.picked);
    if (!pickedSource) return;
    const added = [...pendingAdded];
    const removed = [...pendingRemoved];
    pendingAdded = new Set();
    pendingRemoved = new Set();
    if (!added.length && !removed.length) return;
    if (added.length + removed.length > FULL_REPLACE_THRESHOLD) {
      void pickedSource.setData(collection([...picked.values()]));
      return;
    }
    void pickedSource.updateData({
      remove: removed,
      add: added.flatMap((code) => {
        const feature = picked.get(code);
        return feature ? [feature] : [];
      }),
    });
  };

  return {
    canvas: map.getCanvas(),
    unproject(x, y) {
      const point = map.unproject([x, y]);
      return [point.lng, point.lat];
    },
    project(point) {
      const projected = map.project(point);
      return { x: projected.x, y: projected.y };
    },
    zoom: () => map.getZoom(),
    setInteraction({ dragPan, doubleClickZoom }) {
      if (dragPan) map.dragPan.enable();
      else map.dragPan.disable();
      if (doubleClickZoom) map.doubleClickZoom.enable();
      else map.doubleClickZoom.disable();
    },
    setCursor(cursor) {
      map.getCanvas().style.cursor = cursor === "grab" ? "" : cursor;
    },
    setPicked(codes) {
      picked.clear();
      for (const code of codes) {
        const ring = rings.ring(code);
        if (ring) picked.set(code, cellFeature(code, ring));
      }
      pendingAdded = new Set();
      pendingRemoved = new Set();
      void source(SOURCES.picked)?.setData(collection([...picked.values()]));
    },
    applyChange(change) {
      for (const code of change.removed) {
        if (!picked.delete(code)) continue;
        if (pendingAdded.has(code)) pendingAdded.delete(code);
        else pendingRemoved.add(code);
      }
      for (const code of change.added) {
        const ring = rings.ring(code);
        if (!ring || picked.has(code)) continue;
        picked.set(code, cellFeature(code, ring));
        pendingAdded.add(code);
      }
      if (!flushHandle) flushHandle = requestAnimationFrame(flush);
    },
    setOtherRegions(codes) {
      otherFeatures = [];
      for (const code of codes) {
        const ring = rings.ring(code);
        if (ring) otherFeatures.push(cellFeature(code, ring));
      }
      void source(SOURCES.others)?.setData(collection(showOthers ? otherFeatures : []));
    },
    setLayerVisibility(input) {
      if (input.grid !== undefined && input.grid !== showGrid) {
        showGrid = input.grid;
        refreshGrid();
      }
      if (input.others !== undefined && input.others !== showOthers) {
        showOthers = input.others;
        void source(SOURCES.others)?.setData(collection(showOthers ? otherFeatures : []));
      }
    },
    setHoverCell(code) {
      const ring = code ? rings.ring(code) : null;
      hoverData = collection(ring ? [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: ring } }] : []);
      void source(SOURCES.hover)?.setData(hoverData);
    },
    setDraft(draft) {
      const features: Feature[] = [];
      if (draft?.ring) {
        features.push({ type: "Feature", properties: { removing: draft.removing }, geometry: { type: "Polygon", coordinates: [draft.ring] } as Geometry });
      }
      if (draft?.line && draft.line.length >= 2) {
        features.push({ type: "Feature", properties: { removing: draft.removing }, geometry: { type: "LineString", coordinates: draft.line } });
      }
      draftData = collection(features);
      void source(SOURCES.draft)?.setData(draftData);
    },
    setCentre(point, { draggable }) {
      if (!point) {
        centreMarker?.remove();
        centreMarker = null;
        return;
      }
      if (!centreMarker) {
        centreMarker = new Marker({ element: createCentreElement(), draggable }).setLngLat(point).addTo(map);
        centreMarker.on("dragend", () => {
          const position = centreMarker?.getLngLat();
          if (!position) return;
          for (const listener of centreListeners) listener([position.lng, position.lat]);
        });
      } else {
        centreMarker.setLngLat(point);
        centreMarker.setDraggable(draggable);
      }
      centreMarker.getElement().dataset.draggable = String(draggable);
    },
    async setBackground(background, nextPalette) {
      if (removed) return null;
      const generation = ++styleGeneration;
      palette = nextPalette;
      map.setStyle(styleFor(background, palette.blank), { diff: false });
      let applied = background;
      try {
        await waitForStyle(map, STYLE_TIMEOUT_MS, stopping.signal);
      } catch {
        if (removed || generation !== styleGeneration) return null;
        map.setStyle(styleFor("none", palette.blank), { diff: false });
        await waitForStyle(map, STYLE_TIMEOUT_MS, stopping.signal);
        applied = "none";
      }
      if (removed || generation !== styleGeneration) return null;
      addOverlay(map, palette, currentData());
      pendingAdded = new Set();
      pendingRemoved = new Set();
      currentBackground = applied;
      return applied;
    },
    background: () => currentBackground,
    setLabels(labels) {
      const canvasLabel = labels["Map.Title"];
      if (canvasLabel) map.getCanvas().setAttribute("aria-label", canvasLabel);
      const toggle = map.getContainer().querySelector<HTMLElement>(".maplibregl-ctrl-attrib-button");
      const toggleLabel = labels["AttributionControl.ToggleAttribution"];
      if (toggle && toggleLabel) {
        toggle.title = toggleLabel;
        toggle.setAttribute("aria-label", toggleLabel);
      }
    },
    fitBounds(bounds, insets = {}) {
      const rtl = document.documentElement.dir === "rtl";
      const end = FIT_PADDING + (insets.end ?? 0);
      map.fitBounds(
        [
          [bounds.west, bounds.south],
          [bounds.east, bounds.north],
        ],
        {
          padding: {
            top: FIT_PADDING,
            bottom: FIT_PADDING + (insets.bottom ?? 0),
            left: rtl ? end : FIT_PADDING,
            right: rtl ? FIT_PADDING : end,
          },
          animate: false,
        },
      );
    },
    zoomBy(delta) {
      map.easeTo({ zoom: map.getZoom() + delta });
    },
    centre() {
      const center = map.getCenter();
      return [center.lng, center.lat];
    },
    onViewChange(listener) {
      viewListeners.add(listener);
      return () => viewListeners.delete(listener);
    },
    onCentreMoved(listener) {
      centreListeners.add(listener);
      return () => centreListeners.delete(listener);
    },
    destroy() {
      removed = true;
      styleGeneration += 1;
      stopping.abort();
      clearTimeout(gridTimer);
      if (flushHandle) cancelAnimationFrame(flushHandle);
      map.off("moveend", onMoveEnd);
      centreMarker?.remove();
      map.remove();
    },
  };
}
