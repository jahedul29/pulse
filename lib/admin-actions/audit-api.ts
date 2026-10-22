import { apiData, apiList } from "@/lib/api/client";
import type { Paginated } from "@/lib/api/client";
import { buildListQuery, fetchCsvExport, type ListParams } from "@/lib/api/list-query";
import {
  actionDtoToDetail,
  actionDtoToRow,
  changeDtoToDetail,
  changeDtoToRow,
  type AdminActionLogDto,
  type ChangeLogDto,
} from "./dto";
import type { AdminAction, ChangeLogEntry } from "./types";
import { ADMIN_ACTION_LOGS_PATH, CHANGE_LOGS_PATH } from "@/lib/api/audit-paths";

export type { ListParams };

export async function listAdminActions(params: ListParams): Promise<Paginated<AdminAction>> {
  const { data, meta } = await apiList<AdminActionLogDto>(ADMIN_ACTION_LOGS_PATH, {
    query: buildListQuery(params),
  });
  return { data: data.map(actionDtoToRow), meta };
}

export function getAdminAction(id: string): Promise<AdminAction> {
  return apiData<AdminActionLogDto>(`${ADMIN_ACTION_LOGS_PATH}/${encodeURIComponent(id)}`).then(actionDtoToDetail);
}

export interface ActionFilterOptions {
  actionCodes: string[];
  targetTypes: string[];
}

export async function getActionFilterOptions(): Promise<ActionFilterOptions> {
  const data = await apiData<{ action_codes?: string[] | null; target_types?: string[] | null }>(
    `${ADMIN_ACTION_LOGS_PATH}/filter-options`,
  );
  return { actionCodes: data?.action_codes ?? [], targetTypes: data?.target_types ?? [] };
}

export function exportAdminActionsCsv(params: ListParams): Promise<string> {
  return fetchCsvExport(ADMIN_ACTION_LOGS_PATH, params);
}

export async function listChangeLog(params: ListParams): Promise<Paginated<ChangeLogEntry>> {
  const { data, meta } = await apiList<ChangeLogDto>(CHANGE_LOGS_PATH, {
    query: { ...buildListQuery(params), relations: ["actor", "adminActionLog"] },
  });
  return { data: data.map(changeDtoToRow), meta };
}

export function getChangeLog(id: string): Promise<ChangeLogEntry> {
  return apiData<ChangeLogDto>(`${CHANGE_LOGS_PATH}/${encodeURIComponent(id)}`, {
    query: { relations: ["actor", "adminActionLog"] },
  }).then(changeDtoToDetail);
}

export function exportChangeLogCsv(params: ListParams): Promise<string> {
  return fetchCsvExport(CHANGE_LOGS_PATH, params);
}

export async function countActionChanges(actionId: string): Promise<number> {
  const { data, meta } = await apiList<ChangeLogDto>(CHANGE_LOGS_PATH, {
    query: buildListQuery({ page: 1, perPage: 1, filters: { admin_action_log_id: actionId } }),
  });
  return meta?.total ?? data.length;
}

export const PREVIOUS_CHANGE_SCAN = 10;

export async function findPreviousChange(entry: ChangeLogEntry): Promise<ChangeLogEntry | null> {
  if (!entry.prevRowHash) return null;
  const filters: Record<string, string> = { table_name: entry.table, row_pk: entry.recordId };
  if (entry.createdAt > 0) filters.created_at_to = new Date(entry.createdAt).toISOString();
  const { data } = await apiList<ChangeLogDto>(CHANGE_LOGS_PATH, {
    query: {
      ...buildListQuery({ page: 1, perPage: PREVIOUS_CHANGE_SCAN, sort: { created_at: "desc" }, filters }),
      relations: ["actor", "adminActionLog"],
    },
  });
  const previous = data.find((row) => String(row.id) !== entry.id && row.row_hash === entry.prevRowHash);
  return previous ? changeDtoToRow(previous) : null;
}

export const TARGET_HISTORY_LIMIT = 50;

export async function listTargetHistory(targetId: string): Promise<{ entries: AdminAction[]; total: number }> {
  const { data, meta } = await listAdminActions({
    page: 1,
    perPage: TARGET_HISTORY_LIMIT,
    sort: { created_at: "desc" },
    filters: { target_id: targetId },
  });
  return { entries: [...data].reverse(), total: meta?.total ?? data.length };
}
