export const MAP_BACKGROUNDS = ["grey", "streets", "dark", "none"] as const;

export type MapBackground = (typeof MAP_BACKGROUNDS)[number];

export const DEFAULT_MAP_BACKGROUND: MapBackground = "grey";

export function isMapBackground(value: unknown): value is MapBackground {
  return typeof value === "string" && (MAP_BACKGROUNDS as readonly string[]).includes(value);
}

export function isDarkMapBackground(background: MapBackground, darkTheme: boolean): boolean {
  return background === "dark" || (background === "none" && darkTheme);
}
