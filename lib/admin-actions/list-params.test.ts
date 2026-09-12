import type { ServerTableState } from "@/components/common/data-table";
import { actionServerStateToParams, changeServerStateToParams } from "./list-params";

function state(partial: Partial<ServerTableState>): ServerTableState {
  return { pageIndex: 0, pageSize: 10, search: "", sorting: [], columnFilters: [], ...partial };
}

describe("actionServerStateToParams", () => {
  it("maps result/severity filters + timestamp sort; ignores the non-filterable service column", () => {
    const params = actionServerStateToParams(
      state({
        sorting: [{ id: "timestamp", desc: true }],
        columnFilters: [
          { id: "result", value: ["SUCCESS"] },
          { id: "severity", value: ["CRITICAL"] },
          { id: "service", value: ["admin-identity"] },
        ],
      }),
    );
    expect(params.sort).toEqual({ created_at: "desc" });
    expect(params.filters).toEqual({ result: ["SUCCESS"], severity: ["CRITICAL"] });
  });

  it("maps action-code + target text filters and their sorts", () => {
    const params = actionServerStateToParams(
      state({
        sorting: [{ id: "target", desc: false }],
        columnFilters: [
          { id: "actionCode", value: "ROLE_" },
          { id: "target", value: "ADMIN_ACCOUNT" },
        ],
      }),
    );
    expect(params.sort).toEqual({ target_type: "asc" });
    expect(params.filters).toEqual({ action_code: "ROLE_", target_type: "ADMIN_ACCOUNT" });
  });

  it("sorts by action_code", () => {
    const params = actionServerStateToParams(state({ sorting: [{ id: "actionCode", desc: true }] }));
    expect(params.sort).toEqual({ action_code: "desc" });
  });
});

describe("changeServerStateToParams", () => {
  it("seeds the admin_action_log_id filter from the deep-link even with no table state", () => {
    expect(changeServerStateToParams(null, "A-1")).toEqual({
      page: 1,
      perPage: 10,
      sort: { created_at: "desc" },
      filters: { admin_action_log_id: "A-1" },
    });
  });

  it("maps schema/table/timestamp sorts to server fields", () => {
    expect(changeServerStateToParams(state({ sorting: [{ id: "schema", desc: false }] })).sort).toEqual({
      schema_name: "asc",
    });
    expect(changeServerStateToParams(state({ sorting: [{ id: "table", desc: true }] })).sort).toEqual({
      table_name: "desc",
    });
    expect(changeServerStateToParams(state({ sorting: [{ id: "timestamp", desc: true }] })).sort).toEqual({
      created_at: "desc",
    });
  });

  it("merges operation/table filters with the deep-link action id", () => {
    const params = changeServerStateToParams(
      state({
        columnFilters: [
          { id: "operation", value: ["UPDATE"] },
          { id: "table", value: "admin_accounts" },
        ],
      }),
      "A-9",
    );
    expect(params.filters).toEqual({
      admin_action_log_id: "A-9",
      operation: ["UPDATE"],
      table_name: "admin_accounts",
    });
  });
});
