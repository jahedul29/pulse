import { useAuthStore } from "@/lib/auth/store";
import { useUserStore } from "@/lib/user-management/store";
import { SEED_LOGIN_AUDIT } from "./mock";
import type { LoginAuditEntry, LoginAuditQuery, LoginMethod } from "./types";

export const UNMATCHED_ADMIN = "__unmatched__";

function liveEntries(): LoginAuditEntry[] {
  const audit = useAuthStore.getState().audit;
  const admins = useUserStore.getState().users;
  return audit
    .filter((entry) => entry.stage !== "admin")
    .map((entry) => {
      const match = admins.find(
        (admin) => admin.email.toLowerCase() === entry.email.trim().toLowerCase(),
      );
      return {
        id: entry.id,
        createdAt: entry.at,
        attemptedIdentifier: entry.email,
        adminAccountId: match?.id ?? null,
        adminName: match?.name ?? null,
        result: entry.result,
        method: "password_mfa" as LoginMethod,
        ip: entry.ip,
        device: entry.device,
      };
    });
}

export async function fetchLoginAudit(query: LoginAuditQuery = {}): Promise<LoginAuditEntry[]> {
  const { dateFrom, dateTo, results, adminId } = query;
  return [...liveEntries(), ...SEED_LOGIN_AUDIT]
    .filter((entry) => dateFrom == null || entry.createdAt >= dateFrom)
    .filter((entry) => dateTo == null || entry.createdAt <= dateTo)
    .filter((entry) => !results || results.length === 0 || results.includes(entry.result))
    .filter((entry) => {
      if (!adminId) return true;
      if (adminId === UNMATCHED_ADMIN) return entry.adminAccountId === null;
      return entry.adminAccountId === adminId;
    })
    .sort((first, second) => second.createdAt - first.createdAt);
}

export function auditAdminOptions(): { id: string; name: string }[] {
  return useUserStore.getState().users.map((admin) => ({ id: admin.id, name: admin.name }));
}
