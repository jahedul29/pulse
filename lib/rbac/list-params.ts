import type { ServerTableState } from "@/components/common/data-table";
import type { ListParams } from "./rbac-api";

const SORT_FIELD: Record<string, string> = { role: "name", created: "created_at", type: "is_system" };

export function serverStateToParams(state: ServerTableState | null): ListParams {
  if (!state) return { page: 1, perPage: 10 };
  const sort: Record<string, "asc" | "desc"> = {};
  for (const sortEntry of state.sorting) {
    const field = SORT_FIELD[sortEntry.id];
    if (field) sort[field] = sortEntry.desc ? "desc" : "asc";
  }
  const filters: Record<string, string> = {};
  for (const columnFilter of state.columnFilters) {
    if (columnFilter.id === "type" && Array.isArray(columnFilter.value) && columnFilter.value.length === 1) {
      filters.is_system = String(columnFilter.value[0]);
    }
  }
  return {
    page: state.pageIndex + 1,
    perPage: state.pageSize,
    search: state.search.trim() || undefined,
    sort: Object.keys(sort).length ? sort : undefined,
    filters: Object.keys(filters).length ? filters : undefined,
  };
}
