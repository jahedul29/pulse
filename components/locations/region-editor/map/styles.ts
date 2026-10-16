import type { StyleSpecification } from "maplibre-gl";
import type { MapBackground } from "@/lib/region-builder/backgrounds";

const OPENFREEMAP_STYLES = "https://tiles.openfreemap.org/styles";

const STYLE_NAMES: Record<Exclude<MapBackground, "none">, string> = {
  grey: "positron",
  streets: "liberty",
  dark: "dark",
};

export function blankStyle(color: string): StyleSpecification {
  return {
    version: 8,
    sources: {},
    layers: [{ id: "background", type: "background", paint: { "background-color": color } }],
  };
}

export function styleFor(background: MapBackground, blankColor: string): string | StyleSpecification {
  return background === "none" ? blankStyle(blankColor) : `${OPENFREEMAP_STYLES}/${STYLE_NAMES[background]}`;
}
