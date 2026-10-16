"use client";

import { useEffect, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import type { FeatureCollection, Point } from "geojson";
import { Map as MapLibreMap, NavigationControl, Popup, type GeoJSONSource, type MapLayerMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { startAttributionCollapsed } from "@/components/maps/attribution";
import { styleFor } from "@/components/maps/styles";
import { configureMaplibreWorker } from "@/components/maps/worker";

export interface MapMarker {
  lat: number;
  lng: number;
  label: string;
  sub?: string;
  radius?: number;
}

interface MarkerProperties {
  label: string;
  sub: string;
  radius: number;
}

const MARKER_SOURCE = "client-markers";
const MARKER_LAYER = "client-markers";
const DEFAULT_RADIUS = 9;

export function markerCollection(markers: MapMarker[]): FeatureCollection<Point, MarkerProperties> {
  return {
    type: "FeatureCollection",
    features: markers.map((marker) => ({
      type: "Feature",
      properties: { label: marker.label, sub: marker.sub ?? "", radius: marker.radius ?? DEFAULT_RADIUS },
      geometry: { type: "Point", coordinates: [marker.lng, marker.lat] },
    })),
  };
}

function popupContent(label: string, sub: string): HTMLElement {
  const root = document.createElement("div");
  root.className = "font-sans text-xs";
  const name = document.createElement("span");
  name.className = "font-medium";
  name.textContent = label;
  root.append(name);
  if (sub) {
    const detail = document.createElement("span");
    detail.className = "ms-1 text-muted-foreground";
    detail.textContent = sub;
    root.append(detail);
  }
  return root;
}

export default function MapCanvas({
  center,
  zoom,
  markers,
}: {
  center: [number, number];
  zoom: number;
  markers: MapMarker[];
}) {
  const t = useTranslations("clients");
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef(markers);
  const [lat, lng] = center;
  const labels = useMemo(
    () => ({
      "Map.Title": t("mapLabel"),
      "NavigationControl.ZoomIn": t("mapZoomIn"),
      "NavigationControl.ZoomOut": t("mapZoomOut"),
      "AttributionControl.ToggleAttribution": t("mapToggleAttribution"),
    }),
    [t],
  );

  useEffect(() => {
    markersRef.current = markers;
    void mapRef.current?.getSource<GeoJSONSource>(MARKER_SOURCE)?.setData(markerCollection(markers));
  }, [markers]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    configureMaplibreWorker();
    const color = getComputedStyle(container).getPropertyValue("--primary").trim();
    const map = new MapLibreMap({
      container,
      style: styleFor("grey", ""),
      center: [lng, lat],
      zoom,
      scrollZoom: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      attributionControl: { compact: true },
      locale: labels,
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(
      new NavigationControl({ showCompass: false }),
      document.documentElement.dir === "rtl" ? "top-left" : "top-right",
    );
    startAttributionCollapsed(map);
    const popup = new Popup({ closeButton: false, closeOnClick: false, offset: 12 });

    map.on("load", () => {
      map.addSource(MARKER_SOURCE, { type: "geojson", data: markerCollection(markersRef.current) });
      map.addLayer({
        id: MARKER_LAYER,
        type: "circle",
        source: MARKER_SOURCE,
        paint: {
          "circle-radius": ["get", "radius"],
          "circle-color": color,
          "circle-opacity": 0.35,
          "circle-stroke-color": color,
          "circle-stroke-width": 2,
        },
      });
    });
    map.on("mouseenter", MARKER_LAYER, (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature || feature.geometry.type !== "Point") return;
      const properties = feature.properties as MarkerProperties;
      map.getCanvas().style.cursor = "pointer";
      popup
        .setLngLat(feature.geometry.coordinates as [number, number])
        .setDOMContent(popupContent(properties.label, properties.sub))
        .addTo(map);
    });
    map.on("mouseleave", MARKER_LAYER, () => {
      map.getCanvas().style.cursor = "";
      popup.remove();
    });
    mapRef.current = map;

    return () => {
      popup.remove();
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng, zoom, labels]);

  return <div ref={containerRef} className="size-full" />;
}
