import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { queryKeys } from "@/lib/api/query-keys";
import { useAuthStore } from "@/lib/auth/store";
import type { AdminUserRow } from "./types";
import { useUpdateUserStatus } from "./queries";

const mockUpdate = jest.fn();

jest.mock("./users-api", () => ({
  updateUserStatus: (...args: unknown[]) => mockUpdate(...args),
}));

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
}

const user = (id: string) => ({ id, status: "active", effectiveStatus: "active" }) as AdminUserRow;

beforeEach(() => {
  mockUpdate.mockReset();
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
