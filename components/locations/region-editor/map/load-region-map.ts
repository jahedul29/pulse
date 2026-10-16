import type { RegionMapController, RegionMapOptions } from "./region-map";

export type { DraftShape, MapCursor, MapInsets, RegionMapController, RegionMapOptions } from "./region-map";

export async function loadRegionMap(options: RegionMapOptions): Promise<RegionMapController> {
  const { createRegionMap } = await import("./region-map");
  if (options.signal?.aborted) throw new DOMException("Map start was cancelled", "AbortError");
  return createRegionMap(options);
}
