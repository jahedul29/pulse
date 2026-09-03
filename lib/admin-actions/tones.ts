import type { Tone } from "@/components/common/status-badge";
import type { ActionResult, ActionSeverity, ChangeOp } from "./types";

export type { Tone };

export function resultTone(result: ActionResult): Tone {
  if (result === "success") return "success";
  if (result === "partial") return "warning";
  return "danger";
}

export function severityTone(severity: ActionSeverity): Tone {
  if (severity === "critical") return "danger";
  if (severity === "warning") return "warning";
  return "neutral";
}

export function opTone(op: ChangeOp): Tone {
  if (op === "insert") return "success";
  if (op === "update") return "warning";
  return "danger";
}
