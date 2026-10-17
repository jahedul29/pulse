import { apiFetch } from "@/lib/api/client";
import { isForbidden } from "@/lib/api/errors";

export type ProbeOutcome = "allowed" | "denied" | "unreachable";

export async function probeEndpoint(endpoint: string): Promise<ProbeOutcome> {
  try {
    await apiFetch(endpoint, { query: { per_page: 1 } });
    return "allowed";
  } catch (error) {
    return isForbidden(error) ? "denied" : "unreachable";
  }
}
