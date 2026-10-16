import { buildListQuery, csvExportQuery, dateRangeFilters, fetchCsvExport } from "./list-query";
import { ApiError } from "./errors";
import { registerAuthBridge } from "./auth-bridge";

function fakeRes(body: string, contentType: string): Response {
  return {
    status: 200,
    ok: true,
    statusText: "OK",
    headers: { get: (key: string) => (key.toLowerCase() === "content-type" ? contentType : null) },
    text: async () => body,
  } as unknown as Response;
}

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  registerAuthBridge({ getAccessToken: () => "tok", refresh: async () => false, onAuthLost: () => {} });
});

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
    expect(query["filters[status][in]"]).toEqual(["ACTIVE", "SUSPENDED"]);
    expect(query["filters[status]"]).toBeUndefined();
    expect(query["filters[result]"]).toBe("SUCCESS");
  });

  it("sends multi-value filters with the in operator (plain filters[col][] is ignored by the BE)", async () => {
    fetchMock.mockResolvedValueOnce(fakeRes(JSON.stringify({ data: [], meta: null }), "application/json"));
    const { apiList } = await import("./client");
    await apiList("/login-audit-logs", { query: buildListQuery({ filters: { result: ["SUCCESS", "MFA_FAILED"] } }) });
    const decoded = decodeURIComponent(String(fetchMock.mock.calls[0][0]));
    expect(decoded).toContain("filters[result][in][]=SUCCESS");
    expect(decoded).toContain("filters[result][in][]=MFA_FAILED");
    expect(decoded).not.toContain("filters[result][]=");
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

describe("fetchCsvExport", () => {
  it("requests format=csv with Accept: application/json and returns the CSV text", async () => {
    fetchMock.mockResolvedValueOnce(fakeRes("id,action_code\n1,ROLES_CREATE", "text/csv; charset=UTF-8"));
    const csv = await fetchCsvExport("/admin-action-logs", { page: 2, perPage: 10, search: "role" });

    expect(csv).toBe("id,action_code\n1,ROLES_CREATE");
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("format=csv");
    expect(String(url)).toContain("search=role");
    expect(String(url)).not.toContain("per_page");
    expect((init.headers as Record<string, string>).Accept).toBe("application/json");
  });

  it("throws instead of saving JSON when the backend answers with a JSON array", async () => {
    fetchMock.mockResolvedValueOnce(fakeRes(JSON.stringify([{ id: 1 }]), "application/json"));
    await expect(fetchCsvExport("/admin-action-logs", {})).rejects.toBeInstanceOf(ApiError);
  });
});

describe("dateRangeFilters", () => {
  it("emits ISO _from/_to only for the sides that are set", () => {
    expect(dateRangeFilters("created_at", [0, 1000])).toEqual({
      created_at_from: "1970-01-01T00:00:00.000Z",
      created_at_to: "1970-01-01T00:00:01.000Z",
    });
    expect(dateRangeFilters("created_at", [undefined, 1000])).toEqual({ created_at_to: "1970-01-01T00:00:01.000Z" });
    expect(dateRangeFilters("created_at", "nope")).toEqual({});
  });
});
