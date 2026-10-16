import type { LngLat } from "@/lib/mgrs/grid";

const DEGREES_PER_RADIAN = 180 / Math.PI;

export function toMercator([longitude, latitude]: LngLat): LngLat {
  const radians = latitude / DEGREES_PER_RADIAN;
  return [longitude, DEGREES_PER_RADIAN * Math.log(Math.tan(Math.PI / 4 + radians / 2))];
}

export function fromMercator([x, y]: LngLat): LngLat {
  return [x, DEGREES_PER_RADIAN * (2 * Math.atan(Math.exp(y / DEGREES_PER_RADIAN)) - Math.PI / 2)];
}
