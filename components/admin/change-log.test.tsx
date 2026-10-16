import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import mockMessages from "../../messages/en.json";
import { fmtDateTime } from "@/lib/format";
import type { AdminAction, ChangeLogEntry } from "@/lib/admin-actions/types";
import { ChangeLog } from "./change-log";

const mockAction: AdminAction = {
  id: "34",
  createdAt: 0,
  actorId: "",
  actorName: "System",
  actionName: "Sent an invitation",
  entity: "INVITATIONS · inv-1",
  targetType: "INVITATIONS",
  targetId: "inv-1",
  targetUser: null,
  summary: "POST invitations",
  permissionNames: [],
  roleNames: ["admin"],
  result: "SUCCESS",
  severity: "INFO",
  device: "Chrome · macOS",
  inputs: [],
};

const mockEntry: ChangeLogEntry = {
  id: "5",
  createdAt: Date.parse("2026-09-23T14:26:32Z"),
  actionId: "34",
  actionCode: "INVITATIONS_CREATE",
  action: mockAction,
  actorId: "u-5",
  actorName: "Test Administrator",
  actorEmail: "administrator@ababro.ai",
  actorUsername: "SUID-0005",
  schema: "admin",
  table: "admin_invitations",
  recordId: "inv-1",
  operation: "INSERT",
  prevRowHash: null,
  rowHash: "a".repeat(64),
  changes: [
    { column: "status", before: null, after: "PENDING" },
    { column: "invited_by_admin_id", before: null, after: "u-9" },
    { column: "proposed_role_ids", before: null, after: "[3,1]" },
    { column: "expires_at", before: null, after: "2026-09-30 14:26:32" },
  ],
};

let mockDetail: ChangeLogEntry = mockEntry;
const mockQueryResult = {
  data: { data: [mockEntry], meta: { total: 1 } },
  isError: false,
  isPending: false,
  refetch: jest.fn(),
};

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("../../lib/admin-actions/queries", () => ({
  useChangeLog: () => mockQueryResult,
  useAdminActionSearch: () => ({ data: undefined, isPending: false }),
}));

jest.mock("../../lib/admin-actions/audit-api", () => ({
  getChangeLog: jest.fn(async () => mockDetail),
  exportChangeLogCsv: jest.fn(async () => ""),
}));

jest.mock("../../lib/rbac/queries", () => ({
  useRoles: () => ({
    data: {
      data: [
        { id: 3, name: "admin", is_system: true },
        { id: 1, name: "call_center_operator", is_system: true },
      ],
    },
  }),
}));

jest.mock("../../lib/user-management/queries", () => ({
  useAllAdminUsers: () => ({ data: [{ id: "u-9", name: "Dana Okonkwo" }] }),
  useAdminUserSearch: () => ({ data: undefined, isPending: false }),
  useInvitation: () => ({ data: { name: "Omar Haddad", email: "omar@abapro.health" } }),
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

async function openDrawer() {
  render(<ChangeLog />);
  await userEvent.click(screen.getByRole("link", { name: "Insert · Invitations" }));
  return screen.findByRole("dialog", { name: "Sent an invitation" });
}

describe("ChangeLog table", () => {
  it("follows the spec column order with readable data type, fields and first old/new value", () => {
    render(<ChangeLog />);

    const headers = screen.getAllByRole("columnheader").map((header) => header.textContent?.trim());
    expect(headers).toEqual([
      "Created at",
      "User",
      "Action",
      "Data type",
      "Fields changed",
      "Operation",
      "Old value",
      "New value",
    ]);
    const row = screen.getByRole("link", { name: "Insert · Invitations" });
    expect(within(row).getByText("Invitations")).toBeInTheDocument();
    expect(within(row).getByText(/Status, Invited by admin ID/)).toBeInTheDocument();
    expect(within(row).getByText("+2 more")).toBeInTheDocument();
    expect(within(row).getByText("PENDING")).toBeInTheDocument();
    expect(within(row).queryByText("admin_invitations")).not.toBeInTheDocument();
    expect(within(row).queryByText("inv-1")).not.toBeInTheDocument();
  });

  it("shows the previous row hash when the change is linked to an earlier one", async () => {
    mockDetail = { ...mockEntry, prevRowHash: "b".repeat(64) };
    render(<ChangeLog />);
    await userEvent.click(screen.getByRole("link", { name: "Insert · Invitations" }));
    const drawer = await screen.findByRole("dialog", { name: "Sent an invitation" });

    expect(await within(drawer).findByText("b".repeat(64))).toBeInTheDocument();
    expect(within(drawer).queryByText("None, first change to this record")).not.toBeInTheDocument();
    mockDetail = mockEntry;
  });
});

describe("ChangeLog detail drawer", () => {
  beforeEach(() => {
    mockDetail = mockEntry;
  });

  it("shows the actor, record and linked action as links", async () => {
    const drawer = await openDrawer();

    expect(await within(drawer).findByRole("link", { name: "Open admin account Test Administrator" })).toHaveAttribute(
      "href",
      "/admin/user-management?open=u-5",
    );
    expect(within(drawer).getByText("SUID-0005 · administrator@ababro.ai")).toBeInTheDocument();
    expect(within(drawer).getByRole("link", { name: "Invitation" })).toHaveAttribute(
      "href",
      "/admin/user-management?invite=inv-1",
    );
    expect(within(drawer).getByText("Invitations")).toBeInTheDocument();
    expect(within(drawer).getByText("Schema").nextElementSibling).toHaveTextContent("admin");
    expect(within(drawer).getByText("Changed row")).toBeInTheDocument();
    expect(within(drawer).getByText("ID").nextElementSibling).toHaveTextContent("5");
    expect(within(drawer).getByText("Previous row hash").nextElementSibling).toHaveTextContent(
      "None, first change to this record",
    );
    expect(within(drawer).getByText("Row hash").nextElementSibling).toHaveTextContent("a".repeat(64));
    expect(within(drawer).getByText("Omar Haddad")).toBeInTheDocument();
    expect(within(drawer).queryByRole("link", { name: "Omar Haddad" })).not.toBeInTheDocument();
    expect(within(drawer).getByRole("link", { name: "Open action log entry Sent an invitation" })).toHaveAttribute(
      "href",
      "/admin/audit/actions?open=34",
    );
    expect(within(drawer).getByText("Chrome · macOS")).toBeInTheDocument();
    expect(within(drawer).getByText("Roles (1)")).toBeInTheDocument();
  });

  it("renders diff values meaningfully: linked admin, linked role names and house datetime", async () => {
    const drawer = await openDrawer();

    expect(await within(drawer).findByRole("link", { name: "Dana Okonkwo" })).toHaveAttribute(
      "href",
      "/admin/user-management?open=u-9",
    );
    const roleLinks = within(drawer).getAllByRole("link", { name: "admin" });
    expect(roleLinks.every((link) => link.getAttribute("href") === "/admin/roles/3")).toBe(true);
    expect(within(drawer).getByRole("link", { name: "call_center_operator" })).toHaveAttribute("href", "/admin/roles/1");
    expect(within(drawer).getByText(fmtDateTime(Date.UTC(2026, 8, 30, 14, 26, 32), "en"))).toBeInTheDocument();
    expect(within(drawer).queryByText("2026-09-30 14:26:32")).not.toBeInTheDocument();
    expect(within(drawer).queryByText("u-9")).not.toBeInTheDocument();
  });

  it("explains when the BE captured no column values", async () => {
    mockDetail = { ...mockEntry, changes: [] };
    const drawer = await openDrawer();

    expect(await within(drawer).findByText("No column values were captured for this change.")).toBeInTheDocument();
  });
});
