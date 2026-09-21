import type { ServerTableState } from "@/components/common/data-table";
import type { ListParams } from "@/lib/api/list-query";

const SORT_FIELD: Record<string, string> = { lastLogin: "last_login_at", created: "created_at" };
const FILTER_FIELD: Record<string, string> = { status: "status", roles: "roles.id" };
const DATE_FILTER: Record<string, string> = { lastLogin: "last_login_at", created: "created_at" };

export function serverStateToParams(state: ServerTableState | null): ListParams {
  if (!state) return { page: 1, perPage: 25, sort: { created_at: "desc" } };

  const sort: Record<string, "asc" | "desc"> = {};
  for (const entry of state.sorting) {
    const field = SORT_FIELD[entry.id];
    if (field) sort[field] = entry.desc ? "desc" : "asc";
  }

  const filters: Record<string, string | number | string[]> = {};
  for (const columnFilter of state.columnFilters) {
    const dateField = DATE_FILTER[columnFilter.id];
    if (dateField && Array.isArray(columnFilter.value)) {
      const [min, max] = columnFilter.value as [number?, number?];
      if (min != null) filters[`${dateField}_from`] = new Date(min).toISOString();
      if (max != null) filters[`${dateField}_to`] = new Date(max).toISOString();
      continue;
    }
    const field = FILTER_FIELD[columnFilter.id];
    if (field && Array.isArray(columnFilter.value) && columnFilter.value.length) {
      filters[field] = columnFilter.value as string[];
    }
  }

  return {
    page: state.pageIndex + 1,
    perPage: state.pageSize,
    search: state.search.trim() || undefined,
    sort: Object.keys(sort).length ? sort : { created_at: "desc" },
    filters: Object.keys(filters).length ? filters : undefined,
  };
}
