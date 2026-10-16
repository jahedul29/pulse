export type SelectionMode = "toggle" | "add" | "remove";

export interface Modifiers {
  shift: boolean;
  alt: boolean;
}

export function resolveMode(base: SelectionMode, modifiers: Modifiers): SelectionMode {
  if (modifiers.shift) return "add";
  if (modifiers.alt) return "remove";
  return base;
}

export function strokeAdds(firstCellPicked: boolean | null, base: SelectionMode, modifiers: Modifiers): boolean {
  const mode = resolveMode(base, modifiers);
  if (mode === "add") return true;
  if (mode === "remove") return false;
  return firstCellPicked === null ? true : !firstCellPicked;
}

export function applyMode(picked: boolean, mode: SelectionMode): boolean {
  if (mode === "add") return true;
  if (mode === "remove") return false;
  return !picked;
}
