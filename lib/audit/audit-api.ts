import { apiList } from "@/lib/api/client";
import type { Paginated } from "@/lib/api/client";
import { buildListQuery, fetchCsvExport, type ListParams } from "@/lib/api/list-query";
import { loginAuditDtoToEntry, type LoginAuditLogDto } from "./dto";
import type { LoginAuditEntry } from "./types";
import { LOGIN_AUDIT_LOGS_PATH } from "@/lib/api/audit-paths";

export type { ListParams };


export async function listLoginAudit(params: ListParams): Promise<Paginated<LoginAuditEntry>> {
  const { data, meta } = await apiList<LoginAuditLogDto>(LOGIN_AUDIT_LOGS_PATH, {
    query: buildListQuery(params),
  });
  return { data: data.map(loginAuditDtoToEntry), meta };
}

export function exportLoginAuditCsv(params: ListParams): Promise<string> {
  return fetchCsvExport(LOGIN_AUDIT_LOGS_PATH, params);
}
