import { ringBounds, type LngLat } from "@/lib/mgrs/grid";
import { fromMercator, toMercator } from "./mercator";

export const ELLIPSE_SEGMENTS = 72;
const DEGENERATE_DEGREES = 1e-9;

export function rectangleRing(start: LngLat, end: LngLat): LngLat[] {
  return [
    [start[0], start[1]],
    [end[0], start[1]],
    [end[0], end[1]],
    [start[0], end[1]],
    [start[0], start[1]],
  ];
}

export function ellipseRing(start: LngLat, end: LngLat, segments = ELLIPSE_SEGMENTS): LngLat[] {
  const [startX, startY] = toMercator(start);
  const [endX, endY] = toMercator(end);
  const centerX = (startX + endX) / 2;
  const centerY = (startY + endY) / 2;
  const radiusX = Math.abs(startX - endX) / 2;
  const radiusY = Math.abs(startY - endY) / 2;
  const ring: LngLat[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    ring.push(fromMercator([centerX + radiusX * Math.cos(angle), centerY + radiusY * Math.sin(angle)]));
  }
  ring.push(ring[0]);
  return ring;
}

export function closeRing(vertices: LngLat[]): LngLat[] {
  if (!vertices.length) return [];
  const first = vertices[0];
  const last = vertices[vertices.length - 1];
  return first[0] === last[0] && first[1] === last[1] ? [...vertices] : [...vertices, first];
}

export function isDegenerateRing(ring: LngLat[]): boolean {
  if (ring.length < 4) return true;
  const bounds = ringBounds(ring);
  return bounds.east - bounds.west < DEGENERATE_DEGREES || bounds.north - bounds.south < DEGENERATE_DEGREES;
}
