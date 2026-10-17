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
