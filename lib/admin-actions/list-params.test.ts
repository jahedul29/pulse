import type { ServerTableState } from "@/components/common/data-table";
import { actionServerStateToParams, changeServerStateToParams } from "./list-params";

function state(partial: Partial<ServerTableState>): ServerTableState {
  return { pageIndex: 0, pageSize: 10, search: "", sorting: [], columnFilters: [], ...partial };
}

describe("actionServerStateToParams", () => {
  it("maps result/severity filters + timestamp sort; ignores unknown columns", () => {
    const params = actionServerStateToParams(
      state({
        sorting: [{ id: "timestamp", desc: true }],
        columnFilters: [
          { id: "result", value: ["SUCCESS"] },
          { id: "severity", value: ["CRITICAL"] },
          { id: "unknown", value: ["anything"] },
        ],
      }),
    );
    expect(params.sort).toEqual({ created_at: "desc" });
    expect(params.filters).toEqual({ result: ["SUCCESS"], severity: ["CRITICAL"] });
  });

  it("maps the actor filter to admin_account_id + target type sort", () => {
    const params = actionServerStateToParams(
      state({
        sorting: [{ id: "targetType", desc: false }],
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

  it("maps data type/timestamp sorts to server fields; schema is no longer a table column", () => {
    expect(changeServerStateToParams(state({ sorting: [{ id: "schema", desc: false }] })).sort).toEqual({
      created_at: "desc",
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

describe("audit date range + action filters", () => {
  const from = new Date(2026, 8, 23, 0, 0, 0, 0).getTime();
  const to = new Date(2026, 8, 23, 23, 59, 59, 999).getTime();

  it("maps the action log Created at range, action code and target type filters", () => {
    const params = actionServerStateToParams(
      state({
        columnFilters: [
          { id: "timestamp", value: [from, to] },
          { id: "actionCode", value: ["ROLES_CREATE", "ROLES_UPDATE"] },
          { id: "targetType", value: ["ROLES"] },
        ],
      }),
    );
    expect(params.filters).toEqual({
      created_at_from: new Date(from).toISOString(),
      created_at_to: new Date(to).toISOString(),
      action_code: ["ROLES_CREATE", "ROLES_UPDATE"],
      target_type: ["ROLES"],
    });
  });

  it("maps a one-sided change log Created at range and keeps the ?action= seed", () => {
    const params = changeServerStateToParams(state({ columnFilters: [{ id: "timestamp", value: [from, undefined] }] }), "34");
    expect(params.filters).toEqual({ admin_action_log_id: "34", created_at_from: new Date(from).toISOString() });
  });
});
