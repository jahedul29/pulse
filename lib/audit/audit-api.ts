import { apiFetch, apiList } from "@/lib/api/client";
import type { Paginated } from "@/lib/api/client";
import { ADMIN_IDENTITY } from "@/lib/api/config";
import { buildListQuery, csvExportQuery, type ListParams } from "@/lib/api/list-query";
import { loginAuditDtoToEntry, type LoginAuditLogDto } from "./dto";
import type { LoginAuditEntry } from "./types";

export type { ListParams };

const LOGIN_AUDIT = `${ADMIN_IDENTITY}/login-audit-logs`;

export async function listLoginAudit(params: ListParams): Promise<Paginated<LoginAuditEntry>> {
  const { data, meta } = await apiList<LoginAuditLogDto>(LOGIN_AUDIT, {
    query: buildListQuery(params),
  });
  return { data: data.map(loginAuditDtoToEntry), meta };
}

export function exportLoginAuditCsv(params: ListParams): Promise<string> {
  return apiFetch<string>(LOGIN_AUDIT, { query: csvExportQuery(params) });
}
