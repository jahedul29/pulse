"use client";

import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, TileLayer, Tooltip } from "react-leaflet";

export interface MapMarker {
  lat: number;
  lng: number;
  label: string;
  sub?: string;
  radius?: number;
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
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%" }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      {markers.map((marker) => (
        <CircleMarker
          key={`${marker.label}-${marker.lat}-${marker.lng}`}
          center={[marker.lat, marker.lng]}
          radius={marker.radius ?? 9}
          pathOptions={{
            color: "#0f9384",
            weight: 2,
            fillColor: "#0f9384",
            fillOpacity: 0.35,
          }}
        >
          <Tooltip direction="top" offset={[0, -4]}>
            <span className="font-medium">{marker.label}</span>
            {marker.sub ? <span className="ml-1 text-muted-foreground">{marker.sub}</span> : null}
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
