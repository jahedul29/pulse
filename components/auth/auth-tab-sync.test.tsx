import { act, render, waitFor } from "@testing-library/react";
import { AUTH_STORAGE_KEY, useAuthStore } from "@/lib/auth/store";
import { AuthTabSync } from "./auth-tab-sync";

const mockReplace = jest.fn();

jest.mock("next/navigation", () => ({ useRouter: () => ({ replace: mockReplace }) }));

const session = { email: "admin@abapro.ai", name: "Admin", role: "admin", token: "t", issuedAt: Date.now(), adminId: "u-1" };

function storageEvent(value: unknown) {
  const newValue = value === null ? null : JSON.stringify({ state: { session: value, rememberedUntil: {} }, version: 0 });
  if (newValue) localStorage.setItem(AUTH_STORAGE_KEY, newValue);
  else localStorage.removeItem(AUTH_STORAGE_KEY);
  window.dispatchEvent(new StorageEvent("storage", { key: AUTH_STORAGE_KEY, newValue }));
}

describe("AuthTabSync", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    useAuthStore.setState({ session });
  });

  it("signs this tab out when another tab signs out", async () => {
    render(<AuthTabSync />);
    act(() => storageEvent(null));
    expect(mockReplace).toHaveBeenCalledWith("/login");
    await waitFor(() => expect(useAuthStore.getState().session).toBeNull());
  });

  it("treats a stored empty session the same as a sign-out", async () => {
    render(<AuthTabSync />);
    act(() => {
      const newValue = JSON.stringify({ state: { session: null, rememberedUntil: {} }, version: 0 });
      localStorage.setItem(AUTH_STORAGE_KEY, newValue);
      window.dispatchEvent(new StorageEvent("storage", { key: AUTH_STORAGE_KEY, newValue }));
    });
    expect(mockReplace).toHaveBeenCalledWith("/login");
    await waitFor(() => expect(useAuthStore.getState().session).toBeNull());
  });

  it("picks up another tab's change for the same admin without leaving the page", async () => {
    render(<AuthTabSync />);
    act(() => storageEvent({ ...session, permissions: ["ROLES.roles.VIEW"] }));
    await waitFor(() => expect(useAuthStore.getState().session?.permissions).toEqual(["ROLES.roles.VIEW"]));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("ignores a late sign-out event once another admin is signed in", async () => {
    const other = { ...session, adminId: "u-2", email: "other@abapro.ai", token: "t2" };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ state: { session: other, rememberedUntil: {} }, version: 0 }));
    const reload = jest.fn();
    render(<AuthTabSync reload={reload} />);
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: AUTH_STORAGE_KEY, newValue: null }));
    });
    expect(mockReplace).not.toHaveBeenCalled();
    await waitFor(() => expect(useAuthStore.getState().session?.adminId).toBe("u-2"));
    expect(reload).toHaveBeenCalled();
  });
});
