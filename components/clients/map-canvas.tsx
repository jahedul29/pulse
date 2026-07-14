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
      {markers.map((m) => (
        <CircleMarker
          key={`${m.label}-${m.lat}-${m.lng}`}
          center={[m.lat, m.lng]}
          radius={m.radius ?? 9}
          pathOptions={{
            color: "#0f9384",
            weight: 2,
            fillColor: "#0f9384",
            fillOpacity: 0.35,
          }}
        >
          <Tooltip direction="top" offset={[0, -4]}>
            <span className="font-medium">{m.label}</span>
            {m.sub ? <span className="ml-1 text-muted-foreground">{m.sub}</span> : null}
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
