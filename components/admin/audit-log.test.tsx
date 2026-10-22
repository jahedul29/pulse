import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import mockMessages from "../../messages/en.json";
import type { AdminAction } from "@/lib/admin-actions/types";
import { fmtDateTimeParts } from "@/lib/format";
import { AuditLog } from "./audit-log";

const mockAction: AdminAction = {
  id: "36",
  createdAt: Date.parse("2026-10-10T17:14:30Z"),
  actorId: "u-1",
  actorName: "System Admin",
  actionName: "Updated direct permissions",
  entity: "USERS · u-5",
  targetType: "USERS",
  targetId: "u-5",
  service: "SELF",
  serviceLabel: "Self",
  targetUser: { id: "u-5", name: "Test Administrator", username: "SUID-0005", email: "administrator@ababro.ai" },
  summary: "PUT users/u-5/permissions",
  permissionNames: ["Manage User Management invitations.", "View User Management invitations."],
  roleNames: [],
  result: "SUCCESS",
  severity: "INFO",
  correlationId: "corr-1",
  ipHash: "f".repeat(64),
  adminEmail: "admin@ababro.ai",
  device: "",
  inputs: [],
};

let mockDetail: AdminAction = mockAction;

const mockQueryResult = {
  data: { data: [mockAction], meta: { total: 1 } },
  isError: false,
  isPending: false,
  refetch: jest.fn(),
};

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const mockFilterOptions = { data: { actionCodes: ["ROLES_CREATE"], targetTypes: ["ROLES", "USERS"] } };

const mockChangeCount = { data: 0 };

const mockParams: unknown[] = [];

jest.mock("../../lib/admin-actions/queries", () => ({
  useAdminActions: (params: unknown) => {
    mockParams.push(params);
    return mockQueryResult;
  },
  useActionFilterOptions: () => mockFilterOptions,
  useActionChangeCount: () => mockChangeCount,
}));

const mockWriteText = jest.fn<Promise<void>, [string]>(async () => undefined);
Object.defineProperty(navigator, "clipboard", { value: { writeText: mockWriteText }, configurable: true });

jest.mock("../../lib/admin-actions/audit-api", () => ({
  getAdminAction: jest.fn(async () => mockDetail),
  exportAdminActionsCsv: jest.fn(async () => ""),
}));

jest.mock("../../lib/rbac/queries", () => ({
  useRoles: () => ({ data: { data: [{ id: 3, name: "admin", is_system: true }] } }),
}));

jest.mock("../../lib/user-management/queries", () => ({
  useAllAdminUsers: () => ({ data: [{ id: "u-9", name: "Dana Okonkwo", email: "dana@abapro.health" }] }),
  useAdminUserSearch: () => ({ data: undefined, isPending: false }),
  useInvitation: () => ({ data: undefined }),
}));

jest.mock("../../lib/notifications/queries", () => ({
  useAllTemplates: () => ({ data: [{ id: 1, code: "WELCOME", name: "Welcome message" }] }),
  useChannels: () => ({ data: [{ id: 5, code: "WEBHOOK", name: "Webhook" }] }),
  useAlertRoute: () => ({ data: undefined }),
}));

jest.mock("next-intl", () => {
  const messages = mockMessages as Record<string, Record<string, unknown>>;
  const resolve = (ns: string, key: string): unknown =>
    key.split(".").reduce<unknown>((accumulator, part) => (accumulator as Record<string, unknown>)?.[part], messages[ns]);
  return {
    useLocale: () => "en",
    useTranslations: (ns: string) => {
      const translate = (key: string, vars?: Record<string, unknown>) => {
        const value = resolve(ns, key);
        let str = typeof value === "string" ? value : key;
        if (vars) for (const [varName, varValue] of Object.entries(vars)) str = str.replace(`{${varName}}`, String(varValue));
        return str;
      };
      translate.has = (key: string) => typeof resolve(ns, key) === "string";
      return translate;
    },
  };
});

describe("AuditLog", () => {
  beforeEach(() => {
    mockDetail = mockAction;
    mockChangeCount.data = 0;
    mockWriteText.mockClear();
  });

  it("follows the spec column order and shows the target user in the Target column", () => {
    render(<AuditLog />);

    expect(screen.queryByRole("columnheader", { name: /Timestamp/ })).not.toBeInTheDocument();
    const headers = screen.getAllByRole("columnheader").map((header) => header.textContent?.trim());
    expect(headers).toEqual(["Created at", "Result", "User", "Action", "Target type", "Target", "Service", "Importance"]);
    const row = screen.getByRole("link", { name: "Updated direct permissions" });
    expect(within(row).getByText("Users")).toBeInTheDocument();
    expect(within(row).getByText("Self")).toBeInTheDocument();
    expect(within(row).getByText("Test Administrator")).toBeInTheDocument();
    expect(within(row).queryByText("PUT users/u-5/permissions")).not.toBeInTheDocument();
  });

  it("shows target types as readable labels when there is no target user", () => {
    const original = mockQueryResult.data;
    mockQueryResult.data = {
      data: [{ ...mockAction, id: "37", targetUser: null, targetType: "NOTIFICATION_ALERT_ROUTES", targetId: "4" }],
      meta: { total: 1 },
    };
    render(<AuditLog />);

    const row = screen.getByRole("link", { name: "Updated direct permissions" });
    expect(within(row).getByText("Notification alert routes")).toBeInTheDocument();
    expect(within(row).queryByText("NOTIFICATION_ALERT_ROUTES")).not.toBeInTheDocument();
    mockQueryResult.data = original;
  });

  it("resolves non-user targets to names: role from the catalog, else the request payload name", () => {
    const original = mockQueryResult.data;
    mockQueryResult.data = {
      data: [
        { ...mockAction, id: "40", actionName: "Role updated", targetUser: null, targetType: "ROLES", targetId: "3" },
        {
          ...mockAction,
          id: "41",
          actionName: "Cities create",
          targetUser: null,
          targetType: "CITIES",
          targetId: "",
          payloadName: "Dubai",
        },
      ],
      meta: { total: 2 },
    };
    render(<AuditLog />);

    expect(within(screen.getByRole("link", { name: "Role updated" })).getByText("admin")).toBeInTheDocument();
    expect(within(screen.getByRole("link", { name: "Cities create" })).getByText("Dubai")).toBeInTheDocument();
    mockQueryResult.data = original;
  });

  it("lays the drawer out like the table: strip, then user, target, change and tracing sections", async () => {
    render(<AuditLog />);

    await userEvent.click(screen.getByRole("link", { name: "Updated direct permissions" }));
    const drawer = await screen.findByRole("dialog", { name: "Updated direct permissions" });

    expect(within(drawer).getByText("Log ID 36")).toBeInTheDocument();
    const strip = within(drawer).getByText("Created at").closest("dl") as HTMLElement;
    expect(within(strip).getAllByRole("term").map((term) => term.textContent)).toEqual(["Created at", "Result", "Importance"]);
    expect(within(strip).getByText("Success")).toBeInTheDocument();
    expect(within(strip).getByText("Info")).toBeInTheDocument();
    expect(await within(drawer).findAllByRole("heading", { level: 3 })).toHaveLength(4);
    expect(within(drawer).getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual([
      "User",
      "Target",
      "Change",
      "Service & tracing",
    ]);
  });

  it("shows target user and permission names in the detail drawer, hiding empty roles", async () => {
    render(<AuditLog />);

    await userEvent.click(screen.getByRole("link", { name: "Updated direct permissions" }));
    const drawer = await screen.findByRole("dialog");

    expect(await within(drawer).findByText("Target type")).toBeInTheDocument();
    expect(within(drawer).getByText("SUID-0005 · administrator@ababro.ai")).toBeInTheDocument();
    expect(within(drawer).getByText("Permissions (2)")).toBeInTheDocument();
    expect(within(drawer).getByText("Manage User Management invitations.")).toBeInTheDocument();
    expect(within(drawer).getByText("View User Management invitations.")).toBeInTheDocument();
    expect(within(drawer).queryByText(/^Roles \(/)).not.toBeInTheDocument();
    expect(within(drawer).queryByText("Database changes")).not.toBeInTheDocument();
  });

  it("links the admin and target user to their accounts and shows the extended info", async () => {
    render(<AuditLog />);

    await userEvent.click(screen.getByRole("link", { name: "Updated direct permissions" }));
    const drawer = await screen.findByRole("dialog");

    expect(await within(drawer).findByRole("link", { name: "Open admin account System Admin" })).toHaveAttribute(
      "href",
      "/admin/user-management?open=u-1",
    );
    expect(within(drawer).getByRole("link", { name: "Open admin account Test Administrator" })).toHaveAttribute(
      "href",
      "/admin/user-management?open=u-5",
    );
    expect(within(drawer).getByText("Request details")).toBeInTheDocument();
    expect(within(drawer).getByText("No request details recorded.")).toBeInTheDocument();
    expect(within(drawer).getByText("Service").nextElementSibling).toHaveTextContent("Self");
    expect(within(drawer).getByText("Correlation ID").nextElementSibling).toHaveTextContent("corr-1");
    const ipHash = within(drawer).getByText(`${"f".repeat(12)}…${"f".repeat(8)}`);
    expect(ipHash).toHaveAttribute("title", "f".repeat(64));
    expect(within(drawer).queryByText("ID")).not.toBeInTheDocument();
    expect(within(drawer).queryByText("Target id")).not.toBeInTheDocument();
  });

  it("links the database changes made by the action when there are some", async () => {
    mockChangeCount.data = 2;
    render(<AuditLog />);

    await userEvent.click(screen.getByRole("link", { name: "Updated direct permissions" }));
    const drawer = await screen.findByRole("dialog");

    const label = await within(drawer).findByText("Database changes");
    expect(within(label.nextElementSibling as HTMLElement).getByRole("link")).toHaveAttribute(
      "href",
      "/admin/audit/changes?action=36",
    );
  });

  it("copies a link to the entry and the request details as JSON", async () => {
    mockDetail = { ...mockAction, payload: { reason: "Audit" } };
    render(<AuditLog />);

    await userEvent.click(screen.getByRole("link", { name: "Updated direct permissions" }));
    const drawer = await screen.findByRole("dialog");
    await within(drawer).findByText("Target type");

    await userEvent.click(within(drawer).getByRole("button", { name: "Copy link" }));
    expect(mockWriteText).toHaveBeenLastCalledWith("http://localhost/admin/audit/log?open=36");

    expect(within(drawer).getAllByRole("button", { name: "Copy as JSON" })).toHaveLength(1);
    await userEvent.click(within(drawer).getByRole("button", { name: "Copy as JSON" }));
    expect(JSON.parse(mockWriteText.mock.calls.at(-1)?.[0] ?? "null")).toEqual({ reason: "Audit" });
  });

  it("switches the request details between fields and JSON", async () => {
    mockDetail = {
      ...mockAction,
      inputs: [{ key: "reason", label: "Reason", value: "Audit" }],
      payload: { reason: "Audit" },
    };
    render(<AuditLog />);

    await userEvent.click(screen.getByRole("link", { name: "Updated direct permissions" }));
    const drawer = await screen.findByRole("dialog");

    expect(await within(drawer).findByText("Reason")).toBeInTheDocument();
    await userEvent.click(within(drawer).getByRole("tab", { name: "JSON" }));
    expect(within(drawer).getByText(/"reason": "Audit"/)).toBeInTheDocument();
  });

  it("shows masked request values as hidden", async () => {
    mockDetail = { ...mockAction, inputs: [{ key: "password", label: "Password", value: "h••••" }] };
    render(<AuditLog />);

    await userEvent.click(screen.getByRole("link", { name: "Updated direct permissions" }));
    const drawer = await screen.findByRole("dialog");

    expect(await within(drawer).findByText("Hidden, contains sensitive data")).toBeInTheDocument();
    expect(within(drawer).queryByText("h••••")).not.toBeInTheDocument();
  });

  it("hides a raw route summary and resolves payload ids to linked names, dropping duplicates", async () => {
    mockDetail = {
      ...mockAction,
      roleNames: ["admin"],
      inputs: [
        { key: "id", label: "ID", value: "u-5" },
        { key: "permission_ids", label: "Permission IDs", value: "1, 2" },
        { key: "role_ids", label: "Role IDs", value: "3" },
        { key: "template_id", label: "Template ID", value: "1" },
        { key: "channel_id", label: "Channel ID", value: "5" },
        { key: "audience_filter.user_ids", label: "Audience filter · User IDs", value: "u-9" },
        { key: "expires_at", label: "Expires at", value: "2026-09-30 14:26:32" },
      ],
    };
    render(<AuditLog />);

    await userEvent.click(screen.getByRole("link", { name: "Updated direct permissions" }));
    const drawer = await screen.findByRole("dialog");

    expect(await within(drawer).findByRole("link", { name: "Welcome message" })).toHaveAttribute(
      "href",
      "/admin/notifications/templates?open=1",
    );
    expect(within(drawer).getByText("Webhook")).toBeInTheDocument();
    expect(within(drawer).getByRole("link", { name: "Dana Okonkwo" })).toHaveAttribute(
      "href",
      "/admin/user-management?open=u-9",
    );
    const { date, time } = fmtDateTimeParts(Date.UTC(2026, 8, 30, 14, 26, 32), "en");
    const stamp = within(drawer).getByText(date).parentElement as HTMLElement;
    expect(stamp).toHaveClass("font-mono");
    expect(stamp).toHaveTextContent(`${date}${time}`);
    expect(within(drawer).getByRole("link", { name: "admin" })).toHaveAttribute("href", "/admin/roles/3");
    expect(within(drawer).queryByText("Summary")).not.toBeInTheDocument();
    expect(within(drawer).queryByText("PUT users/u-5/permissions")).not.toBeInTheDocument();
    expect(within(drawer).queryByText("Permission IDs")).not.toBeInTheDocument();
    expect(within(drawer).queryByText("Role IDs")).not.toBeInTheDocument();
    expect(within(drawer).queryByText("ID")).not.toBeInTheDocument();
    expect(within(drawer).queryByText("u-5")).not.toBeInTheDocument();
  });
});

describe("AuditLog period presets", () => {
  it("asks the backend for the chosen period as an exact created-at range", async () => {
    render(<AuditLog />);
    mockParams.length = 0;
    await userEvent.click(screen.getByRole("combobox", { name: "Period" }));
    await userEvent.click(await screen.findByRole("option", { name: "Last hour" }));

    await waitFor(() => {
      const last = mockParams[mockParams.length - 1] as { filters?: Record<string, unknown> };
      expect(last.filters?.created_at_from).toEqual(expect.any(String));
      expect(last.filters?.created_at_to).toEqual(expect.any(String));
    });
  });
});

