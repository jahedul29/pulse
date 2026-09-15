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

  it("maps the actor filter to admin_account_id + target sort", () => {
    const params = actionServerStateToParams(
      state({
        sorting: [{ id: "target", desc: false }],
        columnFilters: [{ id: "actor", value: ["u1", "u2"] }],
      }),
    );
    expect(params.sort).toEqual({ target_type: "asc" });
    expect(params.filters).toEqual({ admin_account_id: ["u1", "u2"] });
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

  it("merges operation + actor filters with the deep-link action id", () => {
    const params = changeServerStateToParams(
      state({
        columnFilters: [
          { id: "operation", value: ["UPDATE"] },
          { id: "who", value: ["u1", "u2"] },
        ],
      }),
      "A-9",
    );
    expect(params.filters).toEqual({
      admin_action_log_id: "A-9",
      operation: ["UPDATE"],
      actor_admin_id: ["u1", "u2"],
    });
  });

  it("maps the action filter to admin_action_log_id", () => {
    const params = changeServerStateToParams(
      state({ columnFilters: [{ id: "action", value: ["A-1", "A-2"] }] }),
    );
    expect(params.filters).toEqual({ admin_action_log_id: ["A-1", "A-2"] });
  });
});
