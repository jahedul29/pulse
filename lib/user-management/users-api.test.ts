import { fetchAdminUserDetail, sendInvitation } from "./users-api";

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe("fetchAdminUserDetail", () => {
  it("requests detail=1 so the drawer gets the full account record", async () => {
    fetchMock.mockResolvedValueOnce({
      status: 200,
      ok: true,
      statusText: "OK",
      headers: { get: (key: string) => (key.toLowerCase() === "content-type" ? "application/json" : null) },
      text: async () => JSON.stringify({ success: true, status: 200, data: { id: "u-1", email: "a@ababro.ai" } }),
    } as unknown as Response);

    const user = await fetchAdminUserDetail("u-1");

    expect(user.id).toBe("u-1");
    const url = decodeURIComponent(String(fetchMock.mock.calls[0][0]));
    expect(url).toContain("/api/admin-identity/users/u-1");
    expect(url).toContain("detail=1");
  });
});

describe("sendInvitation", () => {
  const created = () =>
    ({
      status: 201,
      ok: true,
      statusText: "Created",
      headers: { get: (key: string) => (key.toLowerCase() === "content-type" ? "application/json" : null) },
      text: async () => JSON.stringify({ success: true, status: 201, data: { id: "inv-1" } }),
    }) as unknown as Response;

  it("omits role_ids when no proposed roles were picked", async () => {
    fetchMock.mockResolvedValueOnce(created());
    await sendInvitation("12", []);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({ staff_id: 12 });
  });

  it("sends role_ids as numbers when proposed roles were picked", async () => {
    fetchMock.mockResolvedValueOnce(created());
    await sendInvitation("12", ["3", "1"]);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({ staff_id: 12, role_ids: [3, 1] });
  });
});
