import { serverStateToParams } from "./list-params";
import type { ServerTableState } from "@/components/common/data-table";

const st = (overrides: Partial<ServerTableState>): ServerTableState => ({
  pageIndex: 0,
  pageSize: 10,
  search: "",
  sorting: [],
  columnFilters: [],
  ...overrides,
});

describe("serverStateToParams", () => {
  it("defaults to page 1 / 10 when null", () => {
    expect(serverStateToParams(null)).toEqual({ page: 1, perPage: 10 });
  });

  it("maps page (1-based), perPage, and trims search", () => {
    expect(serverStateToParams(st({ pageIndex: 2, pageSize: 25, search: " adm " }))).toMatchObject({
      page: 3,
      perPage: 25,
      search: "adm",
    });
  });

  it("omits an all-whitespace search", () => {
    expect(serverStateToParams(st({ search: "   " })).search).toBeUndefined();
  });

  it("maps known sort ids to server fields + direction", () => {
    expect(serverStateToParams(st({ sorting: [{ id: "role", desc: true }] })).sort).toEqual({ name: "desc" });
    expect(serverStateToParams(st({ sorting: [{ id: "created", desc: false }] })).sort).toEqual({
      created_at: "asc",
    });
  });

  it("drops unknown sort ids (e.g. the access column)", () => {
    expect(serverStateToParams(st({ sorting: [{ id: "access", desc: true }] })).sort).toBeUndefined();
  });

  it("maps a single type filter to is_system", () => {
    expect(serverStateToParams(st({ columnFilters: [{ id: "type", value: ["0"] }] })).filters).toEqual({
      is_system: "0",
    });
  });

  it("omits the type filter when both values are selected", () => {
    expect(
      serverStateToParams(st({ columnFilters: [{ id: "type", value: ["1", "0"] }] })).filters,
    ).toBeUndefined();
  });

  it("maps the created date range to created_at_from/to ISO filters", () => {
    const min = Date.parse("2026-09-01T00:00:00Z");
    const max = Date.parse("2026-09-10T00:00:00Z");
    expect(serverStateToParams(st({ columnFilters: [{ id: "created", value: [min, max] }] })).filters).toEqual({
      created_at_from: new Date(min).toISOString(),
      created_at_to: new Date(max).toISOString(),
    });
  });
});
