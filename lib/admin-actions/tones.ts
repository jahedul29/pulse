import type { Tone } from "@/components/common/status-badge";
import type { ActionResult, ActionSeverity, ChangeOp } from "./types";

export type { Tone };

export function resultTone(r: ActionResult): Tone {
  if (r === "success") return "success";
  if (r === "partial") return "warning";
  return "danger";
}

export function severityTone(s: ActionSeverity): Tone {
  if (s === "critical") return "danger";
  if (s === "warning") return "warning";
  return "neutral";
}

export function opTone(op: ChangeOp): Tone {
  if (op === "insert") return "success";
  if (op === "update") return "warning";
  return "danger";
}
