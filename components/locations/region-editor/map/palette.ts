import { isDarkMapBackground, type MapBackground } from "@/lib/region-builder/backgrounds";

export interface MapPalette {
  picked: string;
  other: string;
  grid: string;
  remove: string;
  blank: string;
}

export function readMapPalette(element: Element, background: MapBackground): MapPalette {
  const styles = getComputedStyle(element);
  const token = (name: string) => styles.getPropertyValue(name).trim();
  const dark = isDarkMapBackground(background, Boolean(element.closest(".dark")));
  return {
    picked: token(dark ? "--map-picked-on-dark" : "--map-picked"),
    other: token("--map-other"),
    grid: token(dark ? "--map-grid-on-dark" : "--map-grid"),
    remove: token("--map-remove"),
    blank: token("--muted"),
  };
}
