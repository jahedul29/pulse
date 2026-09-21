import type { ServerTableState } from "@/components/common/data-table";
import type { ListParams } from "@/lib/api/list-query";

type Filters = Record<string, string | number | string[]>;

function applyFilter(value: unknown, field: string, filters: Filters) {
  if (Array.isArray(value) && value.length) filters[field] = value as string[];
  else if (typeof value === "string" && value.trim()) filters[field] = value.trim();
}

const DELIVERY_SORT: Record<string, string> = {
  timestamp: "sent_at",
  status: "status",
  severity: "severity",
};
const DELIVERY_FILTER: Record<string, string> = {
  status: "status",
  severity: "severity",
  channel: "channel_id",
  campaign: "campaign_id",
  recipient: "admin_account_id",
};

export function deliveriesStateToParams(state: ServerTableState | null): ListParams {
  if (!state) return { page: 1, perPage: 10 };
  const sort: Record<string, "asc" | "desc"> = {};
  for (const sortEntry of state.sorting) {
    const field = DELIVERY_SORT[sortEntry.id];
    if (field) sort[field] = sortEntry.desc ? "desc" : "asc";
  }
  const filters: Filters = {};
  for (const columnFilter of state.columnFilters) {
    const field = DELIVERY_FILTER[columnFilter.id];
    if (field) applyFilter(columnFilter.value, field, filters);
  }
  return {
    page: state.pageIndex + 1,
    perPage: state.pageSize,
    search: state.search.trim() || undefined,
    sort: Object.keys(sort).length ? sort : undefined,
    filters: Object.keys(filters).length ? filters : undefined,
  };
}

const LIVE_ALERT_SORT: Record<string, string> = {
  severity: "severity",
  timestamp: "sent_at",
  status: "status",
};
const LIVE_ALERT_FILTER: Record<string, string> = {
  severity: "severity",
  status: "status",
  channel: "channel_id",
  recipient: "admin_account_id",
};

export function liveAlertsStateToParams(state: ServerTableState | null): ListParams {
  if (!state) return { page: 1, perPage: 10 };
  const sort: Record<string, "asc" | "desc"> = {};
  for (const sortEntry of state.sorting) {
    const field = LIVE_ALERT_SORT[sortEntry.id];
    if (field) sort[field] = sortEntry.desc ? "desc" : "asc";
  }
  const filters: Filters = {};
  for (const columnFilter of state.columnFilters) {
    const field = LIVE_ALERT_FILTER[columnFilter.id];
    if (field) applyFilter(columnFilter.value, field, filters);
  }
  return {
    page: state.pageIndex + 1,
    perPage: state.pageSize,
    search: state.search.trim() || undefined,
    sort: Object.keys(sort).length ? sort : undefined,
    filters: Object.keys(filters).length ? filters : undefined,
  };
}

const ROUTE_SORT: Record<string, string> = {
  priority: "priority",
  severity: "severity",
  code: "code",
  name: "name",
  created: "created_at",
};
const ROUTE_FILTER: Record<string, string> = {
  active: "is_active",
  severity: "severity",
  channel: "channel_id",
  audience: "audience_type",
};

export function alertRoutesStateToParams(state: ServerTableState | null): ListParams {
  if (!state) return { page: 1, perPage: 10 };
  const sort: Record<string, "asc" | "desc"> = {};
  for (const sortEntry of state.sorting) {
    const field = ROUTE_SORT[sortEntry.id];
    if (field) sort[field] = sortEntry.desc ? "desc" : "asc";
  }
  const filters: Filters = {};
  for (const columnFilter of state.columnFilters) {
    const field = ROUTE_FILTER[columnFilter.id];
    if (field) applyFilter(columnFilter.value, field, filters);
  }
  return {
    page: state.pageIndex + 1,
    perPage: state.pageSize,
    search: state.search.trim() || undefined,
    sort: Object.keys(sort).length ? sort : undefined,
    filters: Object.keys(filters).length ? filters : undefined,
  };
}
