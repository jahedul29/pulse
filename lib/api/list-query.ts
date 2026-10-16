import { apiFetch, apiList, type QueryValue } from "./client";
import { ApiError } from "./errors";

const LIST_ALL_PAGE = 100;
const LIST_ALL_MAX_PAGES = 50;

export interface ListParams {
  page?: number;
  perPage?: number;
  search?: string;
  sort?: Record<string, "asc" | "desc">;
  filters?: Record<string, string | number | string[]>;
}

export function dateRangeFilters(field: string, value: unknown): Record<string, string> {
  if (!Array.isArray(value)) return {};
  const [min, max] = value as [number | null | undefined, number | null | undefined];
  const out: Record<string, string> = {};
  if (typeof min === "number") out[`${field}_from`] = new Date(min).toISOString();
  if (typeof max === "number") out[`${field}_to`] = new Date(max).toISOString();
  return out;
}

export function buildListQuery(params: ListParams): Record<string, QueryValue | QueryValue[]> {
  const query: Record<string, QueryValue | QueryValue[]> = {
    page: params.page ?? 1,
    per_page: params.perPage ?? 10,
    search: params.search || undefined,
  };
  if (params.sort) for (const [key, value] of Object.entries(params.sort)) query[`sort[${key}]`] = value;
  if (params.filters) {
    for (const [key, value] of Object.entries(params.filters)) {
      query[Array.isArray(value) ? `filters[${key}][in]` : `filters[${key}]`] = value;
    }
  }
  return query;
}

export function csvExportQuery(params: ListParams): Record<string, QueryValue | QueryValue[]> {
  const query = buildListQuery(params);
  delete query.page;
  delete query.per_page;
  query.format = "csv";
  return query;
}

export async function fetchCsvExport(path: string, params: ListParams): Promise<string> {
  const body = await apiFetch<unknown>(path, {
    query: csvExportQuery(params),
    headers: { Accept: "application/json" },
  });
  if (typeof body !== "string") throw new ApiError("unknown", 200, "Export did not return CSV");
  return body;
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
