import { useAuthStore } from "@/lib/auth/store";
import { useUserStore } from "@/lib/user-management/store";
import { SEED_LOGIN_AUDIT } from "./mock";
import type { LoginAuditEntry, LoginAuditQuery, LoginMethod } from "./types";

export const UNMATCHED_ADMIN = "__unmatched__";

function liveEntries(): LoginAuditEntry[] {
  const audit = useAuthStore.getState().audit;
  const admins = useUserStore.getState().users;
  return audit
    .filter((a) => a.stage !== "admin")
    .map((a) => {
      const match = admins.find(
        (m) => m.email.toLowerCase() === a.email.trim().toLowerCase(),
      );
      return {
        id: a.id,
        createdAt: a.at,
        attemptedIdentifier: a.email,
        adminAccountId: match?.id ?? null,
        adminName: match?.name ?? null,
        result: a.result,
        method: "password_mfa" as LoginMethod,
        ip: a.ip,
        device: a.device,
      };
    });
}

export async function fetchLoginAudit(query: LoginAuditQuery = {}): Promise<LoginAuditEntry[]> {
  const { dateFrom, dateTo, results, adminId } = query;
  return [...liveEntries(), ...SEED_LOGIN_AUDIT]
    .filter((r) => dateFrom == null || r.createdAt >= dateFrom)
    .filter((r) => dateTo == null || r.createdAt <= dateTo)
    .filter((r) => !results || results.length === 0 || results.includes(r.result))
    .filter((r) => {
      if (!adminId) return true;
      if (adminId === UNMATCHED_ADMIN) return r.adminAccountId === null;
      return r.adminAccountId === adminId;
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function auditAdminOptions(): { id: string; name: string }[] {
  return useUserStore.getState().users.map((a) => ({ id: a.id, name: a.name }));
}
