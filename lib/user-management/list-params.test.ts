import type { ServerTableState } from "@/components/common/data-table";
import { serverStateToParams } from "./list-params";

function state(partial: Partial<ServerTableState>): ServerTableState {
  return { pageIndex: 0, pageSize: 25, search: "", sorting: [], columnFilters: [], ...partial };
}

describe("user-management serverStateToParams", () => {
  it("defaults to page 1 / 25 + created_at desc", () => {
    expect(serverStateToParams(null)).toEqual({ page: 1, perPage: 25, sort: { created_at: "desc" } });
  });

  it("maps page, size, search and lastLogin sort to last_login_at", () => {
    const params = serverStateToParams(
      state({ pageIndex: 1, pageSize: 50, search: " active ", sorting: [{ id: "lastLogin", desc: true }] }),
    );
    expect(params.page).toBe(2);
    expect(params.perPage).toBe(50);
    expect(params.search).toBe("active");
    expect(params.sort).toEqual({ last_login_at: "desc" });
  });

  it("maps status + roles filters to filters[status] / filters[roles.id]", () => {
    const params = serverStateToParams(
      state({
        columnFilters: [
          { id: "status", value: ["ACTIVE", "SUSPENDED"] },
          { id: "roles", value: ["3", "7"] },
        ],
      }),
    );
    expect(params.filters).toEqual({ status: ["ACTIVE", "SUSPENDED"], "roles.id": ["3", "7"] });
  });
});
