import type { ServerTableState } from "@/components/common/data-table";
import type { ListParams } from "@/lib/api/list-query";

type Filters = Record<string, string | number | string[]>;

function toIso(epoch: number): string {
  return new Date(epoch).toISOString();
}

function applyDateRange(value: unknown, filters: Filters) {
  if (!Array.isArray(value)) return;
  const [min, max] = value as [number?, number?];
  if (min != null) filters.created_at_from = toIso(min);
  if (max != null) filters.created_at_to = toIso(max);
}

function finish(
  state: ServerTableState,
  sort: Record<string, "asc" | "desc">,
  filters: Filters,
): ListParams {
  return {
    page: state.pageIndex + 1,
    perPage: state.pageSize,
    search: state.search.trim() || undefined,
    sort: Object.keys(sort).length ? sort : { created_at: "desc" },
    filters: Object.keys(filters).length ? filters : undefined,
  };
}

const ACTION_SORT: Record<string, string> = {
  timestamp: "created_at",
  actionCode: "action_code",
  target: "target_type",
};
const ACTION_FILTER: Record<string, string> = {
  result: "result",
  severity: "severity",
  actionCode: "action_code",
  target: "target_type",
};

function applyFilter(value: unknown, field: string, filters: Filters) {
  if (Array.isArray(value) && value.length) filters[field] = value as string[];
  else if (typeof value === "string" && value.trim()) filters[field] = value.trim();
}

export function actionServerStateToParams(state: ServerTableState | null): ListParams {
  if (!state) return { page: 1, perPage: 10, sort: { created_at: "desc" } };
  const sort: Record<string, "asc" | "desc"> = {};
  for (const entry of state.sorting) {
    const field = ACTION_SORT[entry.id];
    if (field) sort[field] = entry.desc ? "desc" : "asc";
  }
  const filters: Filters = {};
  for (const columnFilter of state.columnFilters) {
    const field = ACTION_FILTER[columnFilter.id];
    if (field) applyFilter(columnFilter.value, field, filters);
    if (columnFilter.id === "timestamp") applyDateRange(columnFilter.value, filters);
  }
  return finish(state, sort, filters);
}

const CHANGE_SORT: Record<string, string> = {
  timestamp: "created_at",
  schema: "schema_name",
  table: "table_name",
};
const CHANGE_FILTER: Record<string, string> = { operation: "operation", table: "table_name" };

export function changeServerStateToParams(
  state: ServerTableState | null,
  actionId?: string | null,
): ListParams {
  const seed: Filters = {};
  if (actionId) seed.admin_action_log_id = actionId;
  if (!state) {
    return {
      page: 1,
      perPage: 10,
      sort: { created_at: "desc" },
      filters: Object.keys(seed).length ? seed : undefined,
    };
  }
  const sort: Record<string, "asc" | "desc"> = {};
  for (const entry of state.sorting) {
    const field = CHANGE_SORT[entry.id];
    if (field) sort[field] = entry.desc ? "desc" : "asc";
  }
  const filters: Filters = { ...seed };
  for (const columnFilter of state.columnFilters) {
    const field = CHANGE_FILTER[columnFilter.id];
    if (field) applyFilter(columnFilter.value, field, filters);
    if (columnFilter.id === "timestamp") applyDateRange(columnFilter.value, filters);
  }
  return finish(state, sort, filters);
}
