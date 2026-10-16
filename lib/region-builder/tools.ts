export type EditorTool = "pan" | "click" | "rectangle" | "ellipse" | "polygon";

export const EDITOR_TOOLS: EditorTool[] = ["pan", "click", "rectangle", "ellipse", "polygon"];

export const TOOL_KEY_CODES: Record<EditorTool, string> = {
  pan: "KeyH",
  click: "KeyC",
  rectangle: "KeyR",
  ellipse: "KeyE",
  polygon: "KeyP",
};

export const TOOL_KEY_LABELS: Record<EditorTool, string> = {
  pan: "H",
  click: "C",
  rectangle: "R",
  ellipse: "E",
  polygon: "P",
};

export function toolForKeyCode(code: string): EditorTool | null {
  return EDITOR_TOOLS.find((tool) => TOOL_KEY_CODES[tool] === code) ?? null;
}

export function isShapeTool(tool: EditorTool): tool is "rectangle" | "ellipse" {
  return tool === "rectangle" || tool === "ellipse";
}
