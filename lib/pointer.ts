export function autoFocusSearch(): boolean {
  return typeof window !== "undefined" && !window.matchMedia("(pointer: coarse)").matches;
}
