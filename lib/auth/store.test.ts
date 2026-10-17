import { useAuthStore } from "./store";
import { login } from "./api";
import { ApiError } from "@/lib/api/errors";
import { LAST_ACTIVITY_KEY } from "./idle";

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

  it("starts the inactivity clock fresh at sign-in", async () => {
    localStorage.setItem(LAST_ACTIVITY_KEY, "1");
    (login as jest.Mock).mockResolvedValueOnce(token({}));
    const before = Date.now();
    await useAuthStore.getState().attempt("admin@ababro.ai", "secret");
    expect(Number(localStorage.getItem(LAST_ACTIVITY_KEY))).toBeGreaterThanOrEqual(before);
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

  it("refreshes permissions, name, role and landing page from the profile of the same admin", async () => {
    (login as jest.Mock).mockResolvedValueOnce(token({ full_name: "System Admin", permissions: ["ROLES.roles.VIEW"] }));
    await useAuthStore.getState().attempt("admin@ababro.ai", "secret");

    useAuthStore.getState().syncProfile({
      id: "u-1",
      email: "admin@ababro.ai",
      full_name: "Renamed Admin",
      roles: ["admin"],
      permissions: ["ROLES.roles.VIEW", "ROLES.roles.EDIT"],
      landing_page: "/admin/roles",
    });
    expect(useAuthStore.getState().session).toMatchObject({
      name: "Renamed Admin",
      role: "admin",
      permissions: ["ROLES.roles.VIEW", "ROLES.roles.EDIT"],
      landingPage: "/admin/roles",
    });
  });

  it("ignores a profile that belongs to another admin", async () => {
    (login as jest.Mock).mockResolvedValueOnce(token({ permissions: ["ROLES.roles.VIEW"] }));
    await useAuthStore.getState().attempt("admin@ababro.ai", "secret");

    useAuthStore.getState().syncProfile({ id: "u-2", email: "other@ababro.ai", permissions: [] });
    expect(useAuthStore.getState().session?.permissions).toEqual(["ROLES.roles.VIEW"]);
  });

  it("ignores a profile for a session without an id unless the email matches", () => {
    useAuthStore.setState({
      session: { email: "admin@ababro.ai", name: "Admin", role: "admin", token: "t", issuedAt: 0, permissions: ["A"] },
    });
    useAuthStore.getState().syncProfile({ id: "u-9", email: "someone@else.ai", permissions: ["B"] });
    expect(useAuthStore.getState().session?.permissions).toEqual(["A"]);
    useAuthStore.getState().syncProfile({ id: "u-9", email: "ADMIN@ababro.ai", permissions: ["B"] });
    expect(useAuthStore.getState().session?.permissions).toEqual(["B"]);
  });

  it("doesn't write a session back when another tab has already replaced it in storage", () => {
    const session = { email: "admin@ababro.ai", name: "Admin", role: "admin", token: "t", issuedAt: 0, adminId: "u-1", permissions: ["A"] };
    useAuthStore.setState({ session });
    localStorage.setItem("abapro-auth", JSON.stringify({ state: { session: null }, version: 0 }));
    useAuthStore.getState().syncProfile({ id: "u-1", email: "admin@ababro.ai", permissions: ["B"] });
    expect(useAuthStore.getState().session?.permissions).toEqual(["A"]);
    expect(JSON.parse(localStorage.getItem("abapro-auth") ?? "{}").state.session).toBeNull();
  });

  it("skips the write when the profile matches the session", () => {
    const session = { email: "admin@ababro.ai", name: "Admin", role: "admin", token: "t", issuedAt: 0, adminId: "u-1", permissions: ["A"], landingPage: null };
    useAuthStore.setState({ session });
    const listener = jest.fn();
    const unsubscribe = useAuthStore.subscribe(listener);
    useAuthStore.getState().syncProfile({ id: "u-1", email: "admin@ababro.ai", full_name: "Admin", roles: ["admin"], permissions: ["A"] });
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });
});
