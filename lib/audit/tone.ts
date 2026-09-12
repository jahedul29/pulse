import type { Tone } from "@/components/common/status-badge";

export function auditTone(value: string): Tone {
  const normalized = (value ?? "").toLowerCase();
  if (/unlock|success|active|complete|insert|create|grant|enabled/.test(normalized)) return "success";
  if (/partial|warn|pending|update|locked|expir/.test(normalized)) return "warning";
  if (/fail|error|invalid|denied|reject|deactiv|suspend|revok|critical|delete|mfa|block/.test(normalized))
    return "danger";
  return "neutral";
}
