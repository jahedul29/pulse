import { apiData, apiFetch, apiList } from "@/lib/api/client";
import type { Paginated, QueryValue } from "@/lib/api/client";
import { ADMIN_IDENTITY } from "@/lib/api/config";
import type {
  PermissionDto,
  PermissionModuleDto,
  RoleDto,
  StoreRoleBody,
  UpdateRoleBody,
} from "./dto";

const ROLES = `${ADMIN_IDENTITY}/roles`;
const PERMISSIONS = `${ADMIN_IDENTITY}/permissions`;
const MODULES = `${ADMIN_IDENTITY}/permission-modules`;

const CATALOG_PAGE = 100;

export interface ListParams {
  page?: number;
  perPage?: number;
  search?: string;
  sort?: Record<string, "asc" | "desc">;
  filters?: Record<string, string | number>;
}

function listQuery(params: ListParams): Record<string, QueryValue> {
  const query: Record<string, QueryValue> = {
    page: params.page ?? 1,
    per_page: params.perPage ?? 15,
    search: params.search || undefined,
  };
  if (params.sort) for (const [key, value] of Object.entries(params.sort)) query[`sort[${key}]`] = value;
  if (params.filters)
    for (const [key, value] of Object.entries(params.filters)) query[`filters[${key}]`] = value;
  return query;
}

export async function listRoles(params: ListParams = {}): Promise<Paginated<RoleDto>> {
  const { data, meta } = await apiList<RoleDto>(ROLES, { query: listQuery(params) });
  return { data, meta };
}

export function getRole(id: number): Promise<RoleDto> {
  return apiData<RoleDto>(`${ROLES}/${id}`, { query: { relations: ["permissions"] } });
}

export function createRole(body: StoreRoleBody): Promise<RoleDto> {
  return apiData<RoleDto>(ROLES, { method: "POST", body });
}

export function updateRole(id: number, body: UpdateRoleBody): Promise<RoleDto> {
  return apiData<RoleDto>(`${ROLES}/${id}`, { method: "PUT", body });
}

export function deleteRole(id: number): Promise<unknown> {
  return apiFetch(`${ROLES}/${id}`, { method: "DELETE" });
}

export function syncRolePermissions(id: number, permissionIds: number[]): Promise<unknown> {
  return apiFetch(`${ROLES}/${id}/permissions`, {
    method: "PUT",
    body: { permission_ids: permissionIds },
  });
}

const MAX_CATALOG_PAGES = 50;

async function listAll<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  let page = 1;
  for (;;) {
    const { data, meta } = await apiList<T>(path, { query: { per_page: CATALOG_PAGE, page } });
    out.push(...data);
    const last = meta?.last_page ?? page;
    if (page >= last || data.length === 0 || page >= MAX_CATALOG_PAGES) break;
    page += 1;
  }
  return out;
}

export function listPermissionModules(): Promise<PermissionModuleDto[]> {
  return listAll<PermissionModuleDto>(MODULES);
}

export function listPermissions(): Promise<PermissionDto[]> {
  return listAll<PermissionDto>(PERMISSIONS);
}
