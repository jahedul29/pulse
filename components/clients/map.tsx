"use client";

import dynamic from "next/dynamic";
import type { MapMarker } from "@/components/clients/map-canvas";

const MapCanvas = dynamic(() => import("@/components/clients/map-canvas"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-muted text-xs text-muted-foreground">
      Loading map…
    </div>
  ),
});

export function Map({
  center,
  zoom = 11,
  markers,
  className = "h-full w-full",
}: {
  center: [number, number];
  zoom?: number;
  markers: MapMarker[];
  className?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-lg border ${className}`}>
      <MapCanvas center={center} zoom={zoom} markers={markers} />
    </div>
  );
}
