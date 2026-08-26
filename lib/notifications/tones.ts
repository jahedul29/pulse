import type { Tone } from "@/components/common/status-badge";
import type { DeliveryStatus, Urgency } from "./types";

export function statusTone(status: DeliveryStatus): Tone {
  if (status === "delivered") return "success";
  if (status === "failed") return "danger";
  return "warning";
}

export function urgencyTone(urgency: Urgency): Tone {
  if (urgency === "high") return "danger";
  if (urgency === "medium") return "warning";
  return "success";
}
