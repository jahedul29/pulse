import { renderHook } from "@testing-library/react";
import { useSuperadminGuard } from "./use-superadmin-guard";

let mockQuery: { data?: unknown; isError: boolean } = { isError: false };

jest.mock("../user-management/queries", () => ({
  useAllAdminUsers: () => mockQuery,
}));

const holder = (id: string, status: string) => ({ id, status, roles: [{ id: "4", name: "superadmin", expiresAt: null }] });

describe("useSuperadminGuard", () => {
  it("says checking until the users list has loaded", () => {
    mockQuery = { data: undefined, isError: false };
    const { result } = renderHook(() => useSuperadminGuard());
    expect(result.current.check("one")).toBe("checking");
  });

  it("blocks instead of allowing when the users list fails to load", () => {
    mockQuery = { data: undefined, isError: true };
    const { result } = renderHook(() => useSuperadminGuard());
    expect(result.current.check("one")).toBe("unverified");
  });

  it("flags the last active Super Admin and lets anyone else through", () => {
    mockQuery = { data: [holder("one", "active"), holder("two", "suspended")], isError: false };
    const { result } = renderHook(() => useSuperadminGuard());
    expect(result.current.check("one")).toBe("last");
    expect(result.current.check("two")).toBeNull();
  });
});
