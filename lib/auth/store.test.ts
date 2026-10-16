import { useAuthStore } from "./store";
import { login } from "./api";
import { ApiError } from "@/lib/api/errors";

jest.mock("./api", () => ({ login: jest.fn() }));

function token(user: Record<string, unknown>) {
  return {
    access_token: "access",
    refresh_token: "refresh",
    token_type: "bearer",
    expires_in: 86400,
    refresh_expires_in: 604800,
    user: { id: "u-1", staff_id: 1, email: "admin@ababro.ai", roles: ["superadmin"], permissions: [], ...user },
  };
}

describe("auth store real login", () => {
  beforeEach(() => {
    useAuthStore.setState({ session: null });
  });

  it("uses the BE full_name as the session display name", async () => {
    (login as jest.Mock).mockResolvedValueOnce(token({ full_name: "System Admin", username: "SUID-0001" }));
    const outcome = await useAuthStore.getState().attempt("admin@ababro.ai", "secret");
    expect(outcome).toMatchObject({ result: "SUCCESS", name: "System Admin" });
    expect(useAuthStore.getState().session?.name).toBe("System Admin");
  });

  it("stores the permission codes returned at login on the session", async () => {
    (login as jest.Mock).mockResolvedValueOnce(
      token({ permissions: ["USER_MANAGEMENT.user_management.EDIT", "ROLES.roles.VIEW"] }),
    );
    await useAuthStore.getState().attempt("admin@ababro.ai", "secret");
    expect(useAuthStore.getState().session?.permissions).toEqual([
      "USER_MANAGEMENT.user_management.EDIT",
      "ROLES.roles.VIEW",
    ]);
  });

  it("falls back to the email when full_name is missing", async () => {
    (login as jest.Mock).mockResolvedValueOnce(token({}));
    await useAuthStore.getState().attempt("admin@ababro.ai", "secret");
    expect(useAuthStore.getState().session?.name).toBe("admin@ababro.ai");
  });

  it("returns the server error kind and backend message when login fails on the server", async () => {
    (login as jest.Mock).mockRejectedValueOnce(
      new ApiError("server", 503, "Service Unavailable", {
        message: "User management service is unavailable. Please try again later.",
      }),
    );
    const outcome = await useAuthStore.getState().attempt("admin@ababro.ai", "secret");
    expect(outcome).toMatchObject({
      result: "SERVER_ERROR",
      serverError: { kind: "unavailable", message: "User management service is unavailable. Please try again later." },
    });
    expect(useAuthStore.getState().session).toBeNull();
  });

  it("keeps invalid credentials as a field error, not a server banner", async () => {
    (login as jest.Mock).mockRejectedValueOnce(new ApiError("validation", 422, "Validation failed", {}));
    const outcome = await useAuthStore.getState().attempt("admin@ababro.ai", "wrong");
    expect(outcome.result).toBe("INVALID_CREDENTIALS");
    expect(outcome.serverError).toBeUndefined();
  });
});
