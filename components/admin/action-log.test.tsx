import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import mockMessages from "../../messages/en.json";
import type { AdminAction } from "@/lib/admin-actions/types";
import { fmtDateTime } from "@/lib/format";
import { ActionLog } from "./action-log";

const mockAction: AdminAction = {
  id: "36",
  createdAt: Date.parse("2026-10-10T17:14:30Z"),
  actorId: "u-1",
  actorName: "System Admin",
  actionName: "Updated direct permissions",
  entity: "USERS · u-5",
  targetType: "USERS",
  targetId: "u-5",
  targetUser: { id: "u-5", name: "Test Administrator", username: "SUID-0005", email: "administrator@ababro.ai" },
  summary: "PUT users/u-5/permissions",
  permissionNames: ["Manage User Management invitations.", "View User Management invitations."],
  roleNames: [],
  result: "SUCCESS",
  severity: "INFO",
  correlationId: "corr-1",
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

jest.mock("../../lib/admin-actions/queries", () => ({
  useAdminActions: () => mockQueryResult,
  useActionFilterOptions: () => mockFilterOptions,
}));

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

describe("ActionLog", () => {
  beforeEach(() => {
    mockDetail = mockAction;
  });

  it("follows the spec column order and shows the target user in the Target column", () => {
    render(<ActionLog />);

    expect(screen.queryByRole("columnheader", { name: /Service/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: /Timestamp/ })).not.toBeInTheDocument();
    const headers = screen.getAllByRole("columnheader").map((header) => header.textContent?.trim());
    expect(headers).toEqual(["Created at", "Result", "User", "Action", "Target type", "Target", "Importance"]);
    const row = screen.getByRole("link", { name: "Updated direct permissions" });
    expect(within(row).getByText("Users")).toBeInTheDocument();
    expect(within(row).getByText("Test Administrator")).toBeInTheDocument();
    expect(within(row).queryByText("PUT users/u-5/permissions")).not.toBeInTheDocument();
  });

  it("shows target types as readable labels when there is no target user", () => {
    const original = mockQueryResult.data;
    mockQueryResult.data = {
      data: [{ ...mockAction, id: "37", targetUser: null, targetType: "NOTIFICATION_ALERT_ROUTES", targetId: "4" }],
      meta: { total: 1 },
    };
    render(<ActionLog />);

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
    render(<ActionLog />);

    expect(within(screen.getByRole("link", { name: "Role updated" })).getByText("admin")).toBeInTheDocument();
    expect(within(screen.getByRole("link", { name: "Cities create" })).getByText("Dubai")).toBeInTheDocument();
    mockQueryResult.data = original;
  });

  it("shows target user and permission names in the detail drawer, hiding empty roles", async () => {
    render(<ActionLog />);

    await userEvent.click(screen.getByRole("link", { name: "Updated direct permissions" }));
    const drawer = await screen.findByRole("dialog");

    expect(await within(drawer).findByText("Target")).toBeInTheDocument();
    expect(within(drawer).getByText("SUID-0005 · administrator@ababro.ai")).toBeInTheDocument();
    expect(within(drawer).getByText("Permissions (2)")).toBeInTheDocument();
    expect(within(drawer).getByText("Manage User Management invitations.")).toBeInTheDocument();
    expect(within(drawer).getByText("View User Management invitations.")).toBeInTheDocument();
    expect(within(drawer).queryByText(/^Roles \(/)).not.toBeInTheDocument();
    expect(within(drawer).queryByText("Service")).not.toBeInTheDocument();
  });

  it("links the admin and target user to their accounts, renames labels and hides raw ids", async () => {
    render(<ActionLog />);

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
    expect(within(drawer).getByText("Created at")).toBeInTheDocument();
    expect(within(drawer).getByText("Request payload")).toBeInTheDocument();
    expect(within(drawer).getByText("No request payload recorded.")).toBeInTheDocument();
    expect(within(drawer).queryByText("Target id")).not.toBeInTheDocument();
    expect(within(drawer).queryByText("Correlation ID")).not.toBeInTheDocument();
    expect(within(drawer).queryByText("corr-1")).not.toBeInTheDocument();
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
    render(<ActionLog />);

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
    expect(within(drawer).getByText(fmtDateTime(Date.UTC(2026, 8, 30, 14, 26, 32), "en"))).toBeInTheDocument();
    expect(within(drawer).getByRole("link", { name: "admin" })).toHaveAttribute("href", "/admin/roles/3");
    expect(within(drawer).queryByText("Summary")).not.toBeInTheDocument();
    expect(within(drawer).queryByText("PUT users/u-5/permissions")).not.toBeInTheDocument();
    expect(within(drawer).queryByText("Permission IDs")).not.toBeInTheDocument();
    expect(within(drawer).queryByText("Role IDs")).not.toBeInTheDocument();
    expect(within(drawer).queryByText("ID")).not.toBeInTheDocument();
  });
});
