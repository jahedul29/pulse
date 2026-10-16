import {
  attachUserRoles,
  createRole,
  deleteRole,
  getAdminAccess,
  getRole,
  listRoles,
  syncRolePermissions,
} from "./rbac-api";

function fakeRes(status: number, body: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    statusText: "Err",
    headers: { get: (key: string) => (key.toLowerCase() === "content-type" ? "application/json" : null) },
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  } as unknown as Response;
}

const env = (data: unknown, status = 200, meta?: unknown) =>
  fakeRes(status, { success: true, message: "", status, data, meta });

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe("rbac-api", () => {
  it("listRoles returns paginated data and encodes page/per_page/search/sort/filters", async () => {
    fetchMock.mockResolvedValueOnce(
      env([{ id: 1, name: "Admin", is_system: true }], 200, {
        current_page: 2,
        last_page: 3,
        per_page: 10,
        total: 25,
        from: 11,
        to: 20,
      }),
    );
    const res = await listRoles({
      page: 2,
      perPage: 10,
      search: "adm",
      sort: { name: "desc" },
      filters: { is_system: "1" },
    });
    expect(res.data).toEqual([{ id: 1, name: "Admin", is_system: true }]);
    expect(res.meta?.total).toBe(25);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("page=2");
    expect(url).toContain("per_page=10");
    expect(url).toContain("search=adm");
    expect(url).toContain("sort%5Bname%5D=desc");
    expect(url).toContain("filters%5Bis_system%5D=1");
  });

  it("getRole requests permissions relation", async () => {
    fetchMock.mockResolvedValueOnce(env({ id: 7, name: "R", is_system: false, permissions: [{ id: 2 }] }));
    const role = await getRole(7);
    expect(role.permissions).toEqual([{ id: 2 }]);
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/admin-identity/roles/7");
    expect(decodeURIComponent(String(url))).toContain("relations[]=permissions");
  });

  it("getAdminAccess reads roles and direct permissions from the detail=1 user response", async () => {
    fetchMock.mockResolvedValueOnce(
      env({
        id: "u-1",
        roles: [{ id: 1, name: "call_center_operator", is_system: true, granted_at: "2026-10-11 17:14:30" }],
        direct_permissions: [
          { id: 7, module_id: 4, action: "VIEW", code: "CLIENTS.clients.VIEW", is_sensitive: false, granted_at: "2026-09-21 18:33:32" },
        ],
        effective_permissions: ["DASHBOARD.dashboard.VIEW", "CLIENTS.clients.VIEW"],
      }),
    );
    const access = await getAdminAccess("u-1");
    expect(access.roles.map((role) => role.name)).toEqual(["call_center_operator"]);
    expect(access.permissions.map((permission) => permission.code)).toEqual(["CLIENTS.clients.VIEW"]);
    expect(access.effectivePermissionCount).toBe(2);
    const decoded = decodeURIComponent(String(fetchMock.mock.calls[0][0]));
    expect(decoded).toContain("/api/admin-identity/users/u-1");
    expect(decoded).toContain("detail=1");
    expect(decoded).not.toContain("relations[]=permissions");
  });

  it("getAdminAccess returns no overlays when the response has no direct permissions", async () => {
    fetchMock.mockResolvedValueOnce(env({ id: "u-1", roles: [] }));
    expect(await getAdminAccess("u-1")).toEqual({ roles: [], permissions: [], effectivePermissionCount: 0 });
  });

  it("createRole posts the body and returns the created role", async () => {
    fetchMock.mockResolvedValueOnce(env({ id: 5, name: "New", is_system: false }, 201));
    const role = await createRole({ name: "New", description: "d" });
    expect(role.id).toBe(5);
    const [url, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(String(url)).toContain("/api/admin-identity/roles");
    expect(JSON.parse(init.body as string)).toEqual({ name: "New", description: "d" });
  });

  it("syncRolePermissions PUTs permission_ids", async () => {
    fetchMock.mockResolvedValueOnce(env({}));
    await syncRolePermissions(3, [1, 2, 3]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("PUT");
    expect(String(url)).toContain("/api/admin-identity/roles/3/permissions");
    expect(JSON.parse(init.body as string)).toEqual({ permission_ids: [1, 2, 3] });
  });

  it("attachUserRoles sends expires_at only when an expiry is chosen", async () => {
    fetchMock.mockResolvedValue(env([]));
    await attachUserRoles("u-1", [3], "2026-12-31T19:59:59.000Z");
    await attachUserRoles("u-1", [4]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(String(url)).toContain("/api/admin-identity/users/u-1/roles");
    expect(JSON.parse(init.body as string)).toEqual({ role_ids: [3], expires_at: "2026-12-31T19:59:59.000Z" });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body as string)).toEqual({ role_ids: [4] });
  });

  it("deleteRole issues a DELETE", async () => {
    fetchMock.mockResolvedValueOnce(fakeRes(204, ""));
    await deleteRole(9);
    const [url, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("DELETE");
    expect(String(url)).toContain("/api/admin-identity/roles/9");
  });
});
