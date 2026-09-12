import { apiData, apiList } from "@/lib/api/client";
import type { Paginated } from "@/lib/api/client";
import { ADMIN_IDENTITY } from "@/lib/api/config";
import { buildListQuery, type ListParams } from "@/lib/api/list-query";
import {
  actionDtoToDetail,
  actionDtoToRow,
  changeDtoToDetail,
  changeDtoToRow,
  type AdminActionLogDto,
  type ChangeLogDto,
} from "./dto";
import type { AdminAction, ChangeLogEntry } from "./types";

export type { ListParams };

const ADMIN_ACTIONS = `${ADMIN_IDENTITY}/admin-action-logs`;
const CHANGE_LOGS = `${ADMIN_IDENTITY}/change-logs`;

export async function listAdminActions(params: ListParams): Promise<Paginated<AdminAction>> {
  const { data, meta } = await apiList<AdminActionLogDto>(ADMIN_ACTIONS, {
    query: buildListQuery(params),
  });
  return { data: data.map(actionDtoToRow), meta };
}

export function getAdminAction(id: string): Promise<AdminAction> {
  return apiData<AdminActionLogDto>(`${ADMIN_ACTIONS}/${encodeURIComponent(id)}`).then(actionDtoToDetail);
}

export async function listChangeLog(params: ListParams): Promise<Paginated<ChangeLogEntry>> {
  const { data, meta } = await apiList<ChangeLogDto>(CHANGE_LOGS, {
    query: buildListQuery(params),
  });
  return { data: data.map(changeDtoToRow), meta };
}

export function getChangeLog(id: string): Promise<ChangeLogEntry> {
  return apiData<ChangeLogDto>(`${CHANGE_LOGS}/${encodeURIComponent(id)}`).then(changeDtoToDetail);
}
