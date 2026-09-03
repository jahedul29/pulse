import { apiFetch } from "./client";
import { ApiError } from "./errors";
import { registerAuthBridge, type AuthBridge } from "./auth-bridge";

function fakeRes(status: number, body: unknown, contentType = "application/json"): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    statusText: "Err",
    headers: { get: (key: string) => (key.toLowerCase() === "content-type" ? contentType : null) },
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  } as unknown as Response;
}

function bridge(overrides: Partial<AuthBridge> = {}): AuthBridge {
  return {
    getAccessToken: () => "tok-123",
    refresh: async () => false,
    onAuthLost: () => {},
    ...overrides,
  };
}

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  registerAuthBridge(bridge());
});

describe("apiFetch", () => {
  it("builds query string and attaches bearer token", async () => {
    fetchMock.mockResolvedValueOnce(fakeRes(200, { ok: true }));
    const out = await apiFetch<{ ok: boolean }>("/admin-users", { query: { page: 2, q: "abc", skip: undefined } });

    expect(out).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/admin-users?page=2&q=abc");
    expect(String(url)).not.toContain("skip");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok-123");
  });

  it("omits Authorization when auth:false", async () => {
    fetchMock.mockResolvedValueOnce(fakeRes(200, {}));
    await apiFetch("/auth/login", { method: "POST", body: { email: "a" }, auth: false });
    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect(init.body).toBe(JSON.stringify({ email: "a" }));
  });

  it("throws typed ApiError with backend message on 4xx", async () => {
    fetchMock.mockResolvedValueOnce(fakeRes(409, { message: "Email already exists" }));
    await expect(apiFetch("/x")).rejects.toMatchObject({
      code: "conflict",
      status: 409,
      message: "Email already exists",
    });
  });

  it("maps 500 to server error", async () => {
    fetchMock.mockResolvedValueOnce(fakeRes(500, "boom", "text/plain"));
    const error = (await apiFetch("/x").catch((caught: unknown) => caught)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe("server");
  });

  it("returns network ApiError when fetch rejects", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("failed to fetch"));
    await expect(apiFetch("/x")).rejects.toMatchObject({ code: "network" });
  });

  it("aborts with timeout ApiError", async () => {
    fetchMock.mockImplementationOnce((_url, init: RequestInit) => {
      return new Promise((_res, reject) => {
        init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      });
    });
    await expect(apiFetch("/slow", { timeoutMs: 10 })).rejects.toMatchObject({ code: "timeout" });
  });

  it("refreshes once on 401 then retries the original request", async () => {
    const refresh = jest.fn(async () => true);
    registerAuthBridge(bridge({ refresh }));
    fetchMock.mockResolvedValueOnce(fakeRes(401, { message: "expired" }));
    fetchMock.mockResolvedValueOnce(fakeRes(200, { data: 1 }));

    const out = await apiFetch<{ data: number }>("/me");
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(out).toEqual({ data: 1 });
  });

  it("calls onAuthLost when refresh fails on 401", async () => {
    const onAuthLost = jest.fn();
    registerAuthBridge(bridge({ refresh: async () => false, onAuthLost }));
    fetchMock.mockResolvedValueOnce(fakeRes(401, {}));

    await expect(apiFetch("/me")).rejects.toMatchObject({ code: "unauthorized" });
    expect(onAuthLost).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns undefined for 204 responses", async () => {
    fetchMock.mockResolvedValueOnce(fakeRes(204, ""));
    const out = await apiFetch("/x", { method: "DELETE" });
    expect(out).toBeUndefined();
  });
});
