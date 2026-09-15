import type { ServerTableState } from "@/components/common/data-table";
import type { ListParams } from "@/lib/api/list-query";

const SORT_FIELD: Record<string, string> = { timestamp: "created_at", result: "result", method: "method" };
const FILTER_FIELD: Record<string, string> = {
  result: "result",
  method: "method",
  admin: "admin_account_id",
};

export function serverStateToParams(state: ServerTableState | null): ListParams {
  if (!state) return { page: 1, perPage: 10, sort: { created_at: "desc" } };

  const sort: Record<string, "asc" | "desc"> = {};
  for (const entry of state.sorting) {
    const field = SORT_FIELD[entry.id];
    if (field) sort[field] = entry.desc ? "desc" : "asc";
  }

  const filters: Record<string, string | number | string[]> = {};
  for (const columnFilter of state.columnFilters) {
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
