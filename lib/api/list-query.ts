import { apiList, type QueryValue } from "./client";

const LIST_ALL_PAGE = 100;
const LIST_ALL_MAX_PAGES = 50;

export interface ListParams {
  page?: number;
  perPage?: number;
  search?: string;
  sort?: Record<string, "asc" | "desc">;
  filters?: Record<string, string | number | string[]>;
}

export function buildListQuery(params: ListParams): Record<string, QueryValue | QueryValue[]> {
  const query: Record<string, QueryValue | QueryValue[]> = {
    page: params.page ?? 1,
    per_page: params.perPage ?? 10,
    search: params.search || undefined,
  };
  if (params.sort) for (const [key, value] of Object.entries(params.sort)) query[`sort[${key}]`] = value;
  if (params.filters) for (const [key, value] of Object.entries(params.filters)) query[`filters[${key}]`] = value;
  return query;
}

export async function listAll<T>(
  path: string,
  query: Record<string, QueryValue | QueryValue[]> = {},
): Promise<T[]> {
  const out: T[] = [];
  let page = 1;
  for (;;) {
    const { data, meta } = await apiList<T>(path, { query: { ...query, per_page: LIST_ALL_PAGE, page } });
    out.push(...data);
    const last = meta?.last_page ?? page;
    if (page >= last || data.length === 0 || page >= LIST_ALL_MAX_PAGES) break;
    page += 1;
  }
  return out;
}
