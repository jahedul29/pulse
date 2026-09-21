import { buildListQuery, csvExportQuery } from "./list-query";

describe("buildListQuery", () => {
  it("sets page/per_page and maps sort/filters/search", () => {
    const query = buildListQuery({
      page: 2,
      perPage: 25,
      search: "term",
      sort: { created_at: "desc" },
      filters: { status: ["ACTIVE", "SUSPENDED"], result: "SUCCESS" },
    });
    expect(query.page).toBe(2);
    expect(query.per_page).toBe(25);
    expect(query.search).toBe("term");
    expect(query["sort[created_at]"]).toBe("desc");
    expect(query["filters[status]"]).toEqual(["ACTIVE", "SUSPENDED"]);
    expect(query["filters[result]"]).toBe("SUCCESS");
  });
});

describe("csvExportQuery", () => {
  it("drops pagination, adds format=csv, keeps filters/sort/search", () => {
    const query = csvExportQuery({
      page: 3,
      perPage: 50,
      search: "term",
      sort: { created_at: "asc" },
      filters: { admin_account_id: "ad-1" },
    });
    expect(query.page).toBeUndefined();
    expect(query.per_page).toBeUndefined();
    expect(query.format).toBe("csv");
    expect(query.search).toBe("term");
    expect(query["sort[created_at]"]).toBe("asc");
    expect(query["filters[admin_account_id]"]).toBe("ad-1");
  });

  it("emits only format when no params given", () => {
    const query = csvExportQuery({});
    expect(query).toEqual({ format: "csv" });
  });
});
