import { act } from "react";
import { render } from "@testing-library/react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth/store";
import { QueryProvider } from "./query-provider";

describe("QueryProvider", () => {
  it("connects the API client to the signed-in session on pages outside the dashboard", async () => {
    await jest.isolateModulesAsync(async () => {
      const { getAuthBridge } = await import("@/lib/api/auth-bridge");
      expect(getAuthBridge()).toBeNull();

      await import("./query-provider");
      const bridge = getAuthBridge();
      expect(bridge).not.toBeNull();

      const { useAuthStore } = await import("@/lib/auth/store");
      useAuthStore.setState({
        session: { email: "owner@abapro.health", name: "Owner", role: "superadmin", token: "access-token", issuedAt: 0 },
      });
      expect(bridge?.getAccessToken()).toBe("access-token");
    });
  });

  it("forgets cached data when the signed-in admin signs out or changes", () => {
    const session = { email: "owner@abapro.health", name: "Owner", role: "superadmin", token: "t", issuedAt: 0 };
    act(() => useAuthStore.setState({ session }));
    let client: QueryClient | null = null;
    function Capture() {
      client = useQueryClient();
      return null;
    }
    render(
      <QueryProvider>
        <Capture />
      </QueryProvider>,
    );
    act(() => client!.setQueryData(["cities"], [{ id: 1 }]));
    act(() => useAuthStore.setState({ session: { ...session, token: "refreshed" } }));
    expect(client!.getQueryData(["cities"])).toEqual([{ id: 1 }]);
    act(() => useAuthStore.setState({ session: null }));
    expect(client!.getQueryData(["cities"])).toBeUndefined();
  });
});
