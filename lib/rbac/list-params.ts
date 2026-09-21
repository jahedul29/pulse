import type { ServerTableState } from "@/components/common/data-table";
import type { ListParams } from "./rbac-api";

const SORT_FIELD: Record<string, string> = { role: "name", type: "is_system", created: "created_at" };

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
    if (columnFilter.id === "active" && Array.isArray(columnFilter.value) && columnFilter.value.length === 1) {
      filters.is_active = String(columnFilter.value[0]);
    }
    if (columnFilter.id === "created" && Array.isArray(columnFilter.value)) {
      const [min, max] = columnFilter.value as [number?, number?];
      if (min != null) filters.created_at_from = new Date(min).toISOString();
      if (max != null) filters.created_at_to = new Date(max).toISOString();
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
