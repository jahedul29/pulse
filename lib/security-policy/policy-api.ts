import { apiData } from "@/lib/api/client";
import { ADMIN_IDENTITY } from "@/lib/api/config";
import type { SecurityPolicyDto, StorePolicyBody } from "./dto";

const BASE = `${ADMIN_IDENTITY}/security-policy`;

export function getCurrentPolicy(): Promise<SecurityPolicyDto> {
  return apiData<SecurityPolicyDto>(`${BASE}/current`);
}

export function listPolicyVersions(): Promise<SecurityPolicyDto[]> {
  return apiData<SecurityPolicyDto[]>(`${BASE}/versions`);
}

export function publishPolicy(body: StorePolicyBody): Promise<SecurityPolicyDto> {
  return apiData<SecurityPolicyDto>(`${BASE}/versions`, { method: "POST", body });
}
