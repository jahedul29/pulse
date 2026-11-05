import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { queryKeys } from "@/lib/api/query-keys";
import { useAuthStore } from "@/lib/auth/store";
import type { AdminUserRow } from "./types";
import { useResendInvitation, useRevokeInvitation, useSendInvitation, useUpdateUserStatus } from "./queries";

const mockUpdate = jest.fn();
const mockSend = jest.fn();
const mockResend = jest.fn();
const mockRevoke = jest.fn();

jest.mock("./users-api", () => ({
  updateUserStatus: (...args: unknown[]) => mockUpdate(...args),
  sendInvitation: (...args: unknown[]) => mockSend(...args),
  resendInvitation: (...args: unknown[]) => mockResend(...args),
  revokeInvitation: (...args: unknown[]) => mockRevoke(...args),
}));

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
}

const user = (id: string) => ({ id, status: "active", effectiveStatus: "active" }) as AdminUserRow;

beforeEach(() => {
  mockUpdate.mockReset();
  mockSend.mockReset();
  mockResend.mockReset();
  mockRevoke.mockReset();
  useAuthStore.setState({ session: { email: "a@abapro.ai", name: "A", role: "superadmin", token: "t", issuedAt: 0 } });
});

describe("useUpdateUserStatus", () => {
  it("patches the all-users list straight away, so the Super Admin guard sees the change", async () => {
    let finish: () => void = () => undefined;
    mockUpdate.mockImplementation(() => new Promise<void>((resolve) => (finish = resolve)));
    const { client, wrapper } = setup();
    client.setQueryData(queryKeys.allAdminUsers(), [user("one"), user("two")]);
    const { result } = renderHook(() => useUpdateUserStatus(), { wrapper });

    act(() => result.current.mutate({ id: "one", status: "suspended" }));

    await waitFor(() =>
      expect(client.getQueryData<AdminUserRow[]>(queryKeys.allAdminUsers())?.[0].status).toBe("suspended"),
    );
    const invalidate = jest.spyOn(client, "invalidateQueries");
    await act(async () => finish());
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.allAdminUsers() }));
  });

  it("puts the all-users list back when the change fails", async () => {
    mockUpdate.mockRejectedValue(new Error("nope"));
    const { client, wrapper } = setup();
    client.setQueryData(queryKeys.allAdminUsers(), [user("one")]);
    const { result } = renderHook(() => useUpdateUserStatus(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: "one", status: "suspended" }).catch(() => undefined);
    });

    expect(client.getQueryData<AdminUserRow[]>(queryKeys.allAdminUsers())?.[0].status).toBe("active");
  });
});

describe("useSendInvitation", () => {
  it("reloads the pending invitations and the invitable staff when the backend refuses the invite", async () => {
    mockSend.mockRejectedValue(new Error("A pending invitation already exists for this staff member."));
    const { client, wrapper } = setup();
    const invalidate = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useSendInvitation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ staffId: "2", roleIds: ["3"] }).catch(() => undefined);
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.pendingInvitations() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.unlinkedStaff() });
  });
});

describe("useResendInvitation", () => {
  it("reloads the invitation lists when the backend refuses the resend, so an expired or revoked invite moves tab", async () => {
    mockResend.mockRejectedValue(new Error("This invitation has expired."));
    const { client, wrapper } = setup();
    const invalidate = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useResendInvitation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("inv-1").catch(() => undefined);
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.pendingInvitations() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.revokedInvitations() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.unlinkedStaff() });
  });
});

describe("useRevokeInvitation", () => {
  it("reloads the invitable staff after a revoke, so the person can be invited again at once", async () => {
    mockRevoke.mockResolvedValue({});
    const { client, wrapper } = setup();
    const invalidate = jest.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useRevokeInvitation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("inv-1");
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.unlinkedStaff() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.revokedInvitations() });
  });
});
