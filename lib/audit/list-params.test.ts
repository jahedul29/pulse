import type { ServerTableState } from "@/components/common/data-table";
import { serverStateToParams } from "./list-params";

function state(partial: Partial<ServerTableState>): ServerTableState {
  return { pageIndex: 0, pageSize: 10, search: "", sorting: [], columnFilters: [], ...partial };
}

describe("login-audit serverStateToParams", () => {
  it("defaults to page 1 + created_at desc when no state", () => {
    expect(serverStateToParams(null)).toEqual({ page: 1, perPage: 10, sort: { created_at: "desc" } });
  });

  it("maps page, size, search, and timestamp sort → created_at", () => {
    const params = serverStateToParams(
      state({ pageIndex: 2, pageSize: 25, search: "  dana ", sorting: [{ id: "timestamp", desc: false }] }),
    );
    expect(params.page).toBe(3);
    expect(params.perPage).toBe(25);
    expect(params.search).toBe("dana");
    expect(params.sort).toEqual({ created_at: "asc" });
  });

  it("maps the result multi-select to filters.result (array)", () => {
    const params = serverStateToParams(
      state({ columnFilters: [{ id: "result", value: ["SUCCESS", "SERVER_ERROR"] }] }),
    );
    expect(params.filters).toEqual({ result: ["SUCCESS", "SERVER_ERROR"] });
  });

  it("maps the admin multi-select to filters.admin_account_id (array)", () => {
    const params = serverStateToParams(state({ columnFilters: [{ id: "admin", value: ["u1", "u2"] }] }));
    expect(params.filters).toEqual({ admin_account_id: ["u1", "u2"] });
  });
});
