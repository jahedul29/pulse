import type { LoginAuditEntry, LoginMethod } from "./types";
import type { LoginResult } from "@/lib/auth/types";

const BASE = 1787270400000;
const MIN = 60_000;

function entry(
  id: string,
  minutesAgo: number,
  attemptedIdentifier: string,
  admin: { id: string; name: string } | null,
  result: LoginResult,
  method: LoginMethod,
  ip: string,
): LoginAuditEntry {
  return {
    id,
    createdAt: BASE - minutesAgo * MIN,
    attemptedIdentifier,
    adminAccountId: admin?.id ?? null,
    adminName: admin?.name ?? null,
    result,
    method,
    ip,
    device: "Chrome · macOS",
  };
}

const DANA = { id: "ad-1", name: "Dana Okonkwo" };
const SAM = { id: "ad-2", name: "Sam Al-Rashid" };
const MARA = { id: "ad-3", name: "Mara Devlin" };
const THEO = { id: "ad-4", name: "Theo Nakamura" };

export const SEED_LOGIN_AUDIT: LoginAuditEntry[] = [
  entry("la-01", 2, "dana.okonkwo@abapro.health", DANA, "SUCCESS", "password_mfa", "203.0.113.24"),
  entry("la-02", 16, "sam.alrashid@abapro.health", SAM, "SUCCESS", "biometric", "203.0.113.61"),
  entry("la-03", 41, "theo.nakamura@abapro.health", THEO, "SUCCESS", "sso", "198.51.100.7"),
  entry("la-04", 61, "j.doe@corp.io", null, "INVALID_CREDENTIALS", "password_mfa", "45.147.229.12"),
  entry("la-05", 62, "j.doe@corp.io", null, "INVALID_CREDENTIALS", "password_mfa", "45.147.229.12"),
  entry("la-06", 63, "j.doe@corp.io", null, "INVALID_CREDENTIALS", "password_mfa", "45.147.229.12"),
  entry("la-07", 64, "j.doe@corp.io", null, "ACCOUNT_LOCKED", "password_mfa", "45.147.229.12"),
  entry("la-08", 92, "mara.devlin@abapro.health", MARA, "MFA_REQUIRED", "password_mfa", "203.0.113.88"),
  entry("la-09", 124, "mara.devlin@abapro.health", MARA, "SUCCESS", "password_mfa", "203.0.113.88"),
  entry("la-10", 181, "dana.okonkwo@abapro.health", DANA, "SUCCESS", "refresh_token", "203.0.113.24"),
  entry("la-11", 240, "admin.tester@partner.co", null, "INVALID_CREDENTIALS", "sso", "192.0.2.55"),
  entry("la-12", 300, "theo.nakamura@abapro.health", THEO, "INVALID_CREDENTIALS", "password_mfa", "203.0.113.140"),
  entry("la-13", 301, "theo.nakamura@abapro.health", THEO, "INVALID_CREDENTIALS", "password_mfa", "203.0.113.140"),
  entry("la-14", 302, "theo.nakamura@abapro.health", THEO, "INVALID_CREDENTIALS", "password_mfa", "203.0.113.140"),
  entry("la-15", 361, "error@abapro.health", null, "SERVER_ERROR", "password_mfa", "203.0.113.9"),
  entry("la-16", 430, "sam.alrashid@abapro.health", SAM, "SUCCESS", "biometric", "203.0.113.61"),
];
