import {
  createCity,
  deleteCountry,
  listAllCities,
  listAllCountries,
  saveCityCoverage,
  updateCountry,
} from "./locations-api";

function fakeResponse(status: number, body: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    statusText: "Err",
    headers: { get: (key: string) => (key.toLowerCase() === "content-type" ? "application/json" : null) },
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  } as unknown as Response;
}

const envelope = (data: unknown, status = 200, meta?: unknown) =>
  fakeResponse(status, { success: true, message: "", status, data, meta });

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

function requestAt(index: number): { url: string; method: string; body: unknown } {
  const [url, init] = fetchMock.mock.calls[index] as [string, RequestInit];
  return { url: String(url), method: init?.method ?? "GET", body: init?.body ? JSON.parse(String(init.body)) : undefined };
}

describe("locations-api", () => {
  it("loads every city page sorted by country, then sort order", async () => {
    fetchMock
      .mockResolvedValueOnce(envelope([{ id: 1 }], 200, { current_page: 1, last_page: 2 }))
      .mockResolvedValueOnce(envelope([{ id: 2 }], 200, { current_page: 2, last_page: 2 }));
    await expect(listAllCities()).resolves.toEqual([{ id: 1 }, { id: 2 }]);
    const url = decodeURIComponent(requestAt(0).url);
    expect(url).toContain("/api/admin-identity/cities?");
    expect(url).toContain("sort[country_id]=asc");
    expect(url).toContain("sort[sort_order]=asc");
    expect(decodeURIComponent(requestAt(1).url)).toContain("page=2");
  });

  it("loads countries sorted by code", async () => {
    fetchMock.mockResolvedValueOnce(envelope([{ id: 1, code: "AE" }], 200, { current_page: 1, last_page: 1 }));
    await expect(listAllCountries()).resolves.toEqual([{ id: 1, code: "AE" }]);
    expect(decodeURIComponent(requestAt(0).url)).toContain("sort[code]=asc");
  });

  it("sends country and city writes to their endpoints", async () => {
    fetchMock
      .mockResolvedValueOnce(envelope({ id: 4 }))
      .mockResolvedValueOnce(fakeResponse(204, ""))
      .mockResolvedValueOnce(envelope({ id: 9 }, 201));
    await updateCountry(4, { code: "AE" });
    await deleteCountry(4);
    await createCity({ country_id: 4, name: { en: "Dubai" }, is_active: true });
    expect(requestAt(0)).toMatchObject({ method: "PUT", body: { code: "AE" } });
    expect(requestAt(0).url).toMatch(/\/countries\/4$/);
    expect(requestAt(1)).toMatchObject({ method: "DELETE" });
    expect(requestAt(2)).toMatchObject({ method: "POST", body: { country_id: 4, name: { en: "Dubai" }, is_active: true } });
    expect(requestAt(2).url).toMatch(/\/cities$/);
  });

  it("replaces a city's coverage", async () => {
    const result = { city_id: 3, tiles_count: 1, points_received: 1, is_active: true, tiles_url: "u", tiles_version: 2 };
    fetchMock.mockResolvedValueOnce(envelope(result));
    const body = { center: { lat: 24, lng: 54 }, points: [{ mgrs: "39Q WG 71500 53500" }], is_active: true };
    await expect(saveCityCoverage(3, body)).resolves.toEqual(result);
    expect(requestAt(0)).toMatchObject({ method: "PUT", body });
    expect(requestAt(0).url).toMatch(/\/cities\/3\/coverage$/);
  });
});
