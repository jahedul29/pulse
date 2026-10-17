import { render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ADMIN_ACTION_LOGS_PATH, CHANGE_LOGS_PATH, LOGIN_AUDIT_LOGS_PATH } from "@/lib/api/audit-paths";
import { useAccessProbes } from "@/lib/auth/access-probes";
import { fetchMe } from "@/lib/auth/api";
import { probeEndpoint } from "@/lib/auth/probe-api";
import { useAuthStore } from "@/lib/auth/store";
import { PermissionSync } from "./permission-sync";

jest.mock("../../lib/auth/api", () => ({ fetchMe: jest.fn(), login: jest.fn() }));
jest.mock("../../lib/auth/probe-api", () => ({ probeEndpoint: jest.fn() }));

function renderSync() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Number.POSITIVE_INFINITY } } });
  const view = render(
    <QueryClientProvider client={client}>
      <PermissionSync />
    </QueryClientProvider>,
  );
  return () => {
    view.unmount();
    client.clear();
  };
}

describe("PermissionSync", () => {
  beforeEach(() => {
    sessionStorage.clear();
    useAccessProbes.setState({ owner: null, results: {} });
    useAuthStore.setState({
      session: {
        email: "admin@abapro.ai",
        name: "Admin",
        role: "admin",
        token: "t",
        accessToken: "t",
        issuedAt: 0,
        adminId: "u-1",
        permissions: ["ROLES.roles.VIEW"],
      },
    });
    jest.mocked(probeEndpoint).mockResolvedValue("allowed");
    jest.mocked(fetchMe).mockResolvedValue({ id: "u-1", email: "admin@abapro.ai", permissions: ["ROLES.roles.VIEW"] });
  });

  it("replaces the stored permissions with the current ones from /me", async () => {
    jest.mocked(fetchMe).mockResolvedValue({
      id: "u-1",
      email: "admin@abapro.ai",
      permissions: ["NOTIFICATIONS.notification_templates.VIEW"],
    });
    const cleanup = renderSync();
    await waitFor(() =>
      expect(useAuthStore.getState().session?.permissions).toEqual(["NOTIFICATIONS.notification_templates.VIEW"]),
    );
    cleanup();
  });

  it("records each audit probe for the signed-in admin, counting an unreachable endpoint as allowed", async () => {
    jest.mocked(probeEndpoint).mockImplementation(async (endpoint) =>
      endpoint === CHANGE_LOGS_PATH ? "denied" : endpoint === LOGIN_AUDIT_LOGS_PATH ? "unreachable" : "allowed",
    );
    const cleanup = renderSync();
    await waitFor(() =>
      expect(useAccessProbes.getState()).toMatchObject({
        owner: "u-1",
        results: { [ADMIN_ACTION_LOGS_PATH]: true, [CHANGE_LOGS_PATH]: false, [LOGIN_AUDIT_LOGS_PATH]: true },
      }),
    );
    cleanup();
  });
});
