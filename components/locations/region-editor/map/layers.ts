import type { FeatureCollection } from "geojson";
import type { AddLayerObject, Map as MapLibreMap } from "maplibre-gl";
import type { MapPalette } from "./palette";

export const SOURCES = {
  others: "rb-others",
  picked: "rb-picked",
  grid: "rb-grid",
  hover: "rb-hover",
  draft: "rb-draft",
} as const;

export const GRID_MIN_ZOOM = 9;
export const OUTLINE_MIN_ZOOM = 10;
const CELL_SOURCE_MAX_ZOOM = 12;

export function overlayLayers(palette: MapPalette): { fills: AddLayerObject[]; lines: AddLayerObject[] } {
  return {
    fills: [
      {
        id: "rb-others-fill",
        type: "fill",
        source: SOURCES.others,
        paint: { "fill-color": palette.other, "fill-opacity": 0.22 },
      },
      {
        id: "rb-picked-fill",
        type: "fill",
        source: SOURCES.picked,
        paint: { "fill-color": palette.picked, "fill-opacity": 0.45 },
      },
    ],
    lines: [
      {
        id: "rb-others-line",
        type: "line",
        source: SOURCES.others,
        minzoom: OUTLINE_MIN_ZOOM,
        paint: { "line-color": palette.other, "line-width": 0.5, "line-opacity": 0.6 },
      },
      {
        id: "rb-grid-line",
        type: "line",
        source: SOURCES.grid,
        minzoom: GRID_MIN_ZOOM,
        filter: ["==", ["get", "kind"], "line"],
        paint: {
          "line-color": palette.grid,
          "line-width": 0.5,
          "line-opacity": ["interpolate", ["linear"], ["zoom"], 9, 0.15, 12, 0.4],
        },
      },
      {
        id: "rb-zone-edge",
        type: "line",
        source: SOURCES.grid,
        filter: ["==", ["get", "kind"], "edge"],
        paint: { "line-color": palette.grid, "line-width": 1.2, "line-opacity": 0.6, "line-dasharray": [4, 3] },
      },
      {
        id: "rb-picked-line",
        type: "line",
        source: SOURCES.picked,
        minzoom: OUTLINE_MIN_ZOOM,
        paint: { "line-color": palette.picked, "line-width": 0.6 },
      },
      {
        id: "rb-hover-line",
        type: "line",
        source: SOURCES.hover,
        paint: { "line-color": palette.grid, "line-width": 1.5 },
      },
      {
        id: "rb-draft-fill",
        type: "fill",
        source: SOURCES.draft,
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: {
          "fill-color": ["case", ["get", "removing"], palette.remove, palette.picked],
          "fill-opacity": 0.08,
        },
      },
      {
        id: "rb-draft-line",
        type: "line",
        source: SOURCES.draft,
        paint: {
          "line-color": ["case", ["get", "removing"], palette.remove, palette.picked],
          "line-width": 1.6,
          "line-dasharray": [3, 2],
        },
      },
    ],
  };
}

export function firstSymbolLayerId(map: MapLibreMap): string | undefined {
  return map.getStyle().layers.find((layer) => layer.type === "symbol")?.id;
}

export function addOverlay(map: MapLibreMap, palette: MapPalette, data: Record<string, FeatureCollection>) {
  if (map.getSource(SOURCES.picked)) return;
  for (const source of Object.values(SOURCES)) {
    const isCellSource = source === SOURCES.picked || source === SOURCES.others;
    map.addSource(source, {
      type: "geojson",
      data: data[source] ?? { type: "FeatureCollection", features: [] },
      ...(isCellSource ? { maxzoom: CELL_SOURCE_MAX_ZOOM } : {}),
    });
  }
  const { fills, lines } = overlayLayers(palette);
  const beforeLabels = firstSymbolLayerId(map);
  for (const layer of fills) map.addLayer(layer, beforeLabels);
  for (const layer of lines) map.addLayer(layer);
}
