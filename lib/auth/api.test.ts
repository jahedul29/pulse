import { login } from "./api";
import { ApiError } from "@/lib/api/errors";

function fakeRes(status: number, body: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    statusText: "Err",
    headers: { get: (key: string) => (key.toLowerCase() === "content-type" ? "application/json" : null) },
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe("login", () => {
  it("posts credentials with fingerprint + platform and unwraps AuthToken", async () => {
    fetchMock.mockResolvedValueOnce(
      fakeRes(200, {
        success: true,
        message: "ok",
        status: 200,
        data: {
          access_token: "acc",
          refresh_token: "ref",
          token_type: "bearer",
          expires_in: 900,
          refresh_expires_in: 3600,
          user: { id: "u-1", email: "a@b.co", roles: ["Admin"], permissions: [] },
        },
      }),
    );

    const tok = await login({ email: "  a@b.co ", password: "pw", remember: true });
    expect(tok.access_token).toBe("acc");
    expect(tok.user.email).toBe("a@b.co");

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/admin-identity/login");
    const sent = JSON.parse(init.body as string);
    expect(sent.email).toBe("a@b.co");
    expect(sent.platform).toBe("WEB");
    expect(typeof sent.fingerprint).toBe("string");
    expect(sent.remember).toBe(true);
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("throws a validation ApiError on 422 (bad credentials)", async () => {
    fetchMock.mockResolvedValueOnce(
      fakeRes(422, {
        success: false,
        message: "Validation failed",
        status: 422,
        errors: [{ field: "email", messages: ["Invalid credentials"] }],
      }),
    );
    const error = (await login({ email: "x@y.z", password: "bad" }).catch((caught: unknown) => caught)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(422);
    expect(error.code).toBe("validation");
  });
});
